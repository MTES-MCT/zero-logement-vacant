import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import type { BetterAuthPlugin } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  formCsrfMiddleware
} from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import * as z from 'zod';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { SALT_LENGTH, type UserApi } from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userRepository from '~/repositories/userRepository';
import { updateUserAndAuth } from '~/services/authUserSyncService';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import mailService from '~/services/mailService';
import {
  calculateLockoutEnd,
  generateSimpleCode,
  hashCode,
  isAccountLocked,
  isCodeExpired,
  MAX_FAILED_ATTEMPTS,
  verifyHashedCode
} from '~/services/twoFactorService';

const adminSignInBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  establishmentId: z.string().uuid().optional()
});

const adminVerifyTwoFactorBody = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
  establishmentId: z.string().uuid().optional()
});

function authenticationFailed(): APIError {
  return new APIError('UNAUTHORIZED', {
    message: 'Authentication failed.'
  });
}

function invalidEmailOrPassword(): APIError {
  return new APIError('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password'
  });
}

async function getAdminUser(email: string): Promise<UserApi> {
  const user = await userRepository.getByEmailIncludingDeleted(email);
  if (!user || user.deletedAt || user.role !== UserRole.ADMIN) {
    throw authenticationFailed();
  }
  return user;
}

async function getAdminUserForSignIn(
  email: string,
  password: string
): Promise<UserApi> {
  const user = await userRepository.getByEmailIncludingDeleted(email);
  if (!user) {
    await bcrypt.hash(password, SALT_LENGTH);
    throw authenticationFailed();
  }

  await assertPassword(user, password);
  if (user.deletedAt || user.role !== UserRole.ADMIN) {
    throw authenticationFailed();
  }

  return user;
}

async function assertPassword(user: UserApi, password: string): Promise<void> {
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw authenticationFailed();
  }
}

async function resolveActiveEstablishmentId(
  user: UserApi,
  establishmentId: string | undefined
): Promise<string> {
  const activeEstablishmentId = establishmentId ?? user.establishmentId;
  if (!activeEstablishmentId) {
    throw new APIError('UNPROCESSABLE_ENTITY', {
      message: 'Admin sign-in requires an establishment.'
    });
  }

  const establishment = await establishmentRepository.get(activeEstablishmentId);
  if (!establishment) {
    throw new APIError('UNPROCESSABLE_ENTITY', {
      message: 'Admin sign-in establishment does not exist.'
    });
  }

  return establishment.id;
}

async function sendAdminTwoFactorCode(user: UserApi): Promise<void> {
  const code = generateSimpleCode();
  const now = new Date();
  const hashedCode = await hashCode(code);

  await userRepository.update({
    ...user,
    twoFactorCode: hashedCode,
    twoFactorCodeGeneratedAt: now.toJSON(),
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    updatedAt: now.toJSON()
  });

  await mailService.sendTwoFactorCode(code, {
    recipients: [user.email]
  });

  logger.info('2FA code sent to admin user through better-auth', {
    userId: user.id,
    email: user.email,
    action: 'auth_v2_2fa_code_sent'
  });
}

async function verifyAdminTwoFactorCode(
  user: UserApi,
  code: string
): Promise<void> {
  if (
    isAccountLocked(
      user.twoFactorLockedUntil ? new Date(user.twoFactorLockedUntil) : null
    )
  ) {
    throw authenticationFailed();
  }

  if (!user.twoFactorCode || !user.twoFactorCodeGeneratedAt) {
    throw authenticationFailed();
  }

  if (isCodeExpired(new Date(user.twoFactorCodeGeneratedAt))) {
    throw authenticationFailed();
  }

  const isValidCode = await verifyHashedCode(code, user.twoFactorCode);
  if (isValidCode) {
    return;
  }

  const failedAttempts = user.twoFactorFailedAttempts + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
  await userRepository.update({
    ...user,
    twoFactorFailedAttempts: failedAttempts,
    twoFactorLockedUntil: shouldLock
      ? calculateLockoutEnd().toJSON()
      : user.twoFactorLockedUntil,
    updatedAt: new Date().toJSON()
  });

  throw authenticationFailed();
}

async function createAdminSession(
  ctx: any,
  user: UserApi,
  establishmentId: string | undefined
) {
  const activeEstablishmentId = await resolveActiveEstablishmentId(
    user,
    establishmentId
  );

  const session = await ctx.context.internalAdapter.createSession(
    user.id,
    false,
    { activeEstablishmentId },
    true
  );
  const authUser = await ctx.context.internalAdapter.findUserByEmail(
    user.email
  );
  if (!authUser) {
    throw authenticationFailed();
  }

  await setSessionCookie(ctx, {
    session,
    user: authUser.user
  });

  return session;
}

export function zlvAdminTwoFactor(): BetterAuthPlugin {
  return {
    id: 'zlv-admin-two-factor',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-in/email',
          handler: createAuthMiddleware(async (ctx) => {
            const email = ctx.body?.email;
            if (typeof email !== 'string') {
              return;
            }

            const user = await userRepository.getByEmailIncludingDeleted(email);
            if (user?.role === UserRole.ADMIN) {
              const password = ctx.body?.password;
              if (typeof password === 'string') {
                await ctx.context.password.hash(password);
              }
              throw invalidEmailOrPassword();
            }
          })
        }
      ]
    },
    endpoints: {
      adminSignIn: createAuthEndpoint(
        '/admin/sign-in',
        {
          method: 'POST',
          use: [formCsrfMiddleware],
          body: adminSignInBody
        },
        async (ctx) => {
          const user = await getAdminUserForSignIn(
            ctx.body.email,
            ctx.body.password
          );
          await resolveActiveEstablishmentId(user, ctx.body.establishmentId);

          if (!config.auth.admin2faEnabled) {
            await createAdminSession(ctx, user, ctx.body.establishmentId);
            return ctx.json({ requiresTwoFactor: false, email: user.email });
          }

          await sendAdminTwoFactorCode(user);
          return ctx.json({
            requiresTwoFactor: true,
            email: user.email
          });
        }
      ),
      adminVerifyTwoFactor: createAuthEndpoint(
        '/admin/verify-2fa',
        {
          method: 'POST',
          use: [formCsrfMiddleware],
          body: adminVerifyTwoFactorBody
        },
        async (ctx) => {
          const user = await getAdminUser(ctx.body.email);
          await verifyAdminTwoFactorCode(user, ctx.body.code);

          const now = new Date().toJSON();
          const kind = await fetchUserKind(user.email);
          const updatedUser: UserApi = {
            ...user,
            kind,
            twoFactorCode: null,
            twoFactorCodeGeneratedAt: null,
            twoFactorFailedAttempts: 0,
            twoFactorLockedUntil: null,
            lastAuthenticatedAt: now,
            updatedAt: now
          };
          await updateUserAndAuth(updatedUser);
          await createAdminSession(ctx, updatedUser, ctx.body.establishmentId);

          return ctx.json({ status: true });
        }
      )
    }
  };
}
