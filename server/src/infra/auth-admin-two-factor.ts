import { UserRole } from '@zerologementvacant/models';
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
import type { UserApi } from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userRepository from '~/repositories/userRepository';
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
  establishmentId: z.string().uuid()
});

const adminVerifyTwoFactorBody = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
  establishmentId: z.string().uuid()
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

interface CredentialContext {
  context: {
    internalAdapter: {
      findAccounts(userId: string): Promise<
        Array<{
          providerId: string;
          password?: string | null;
        }>
      >;
    };
    password: {
      hash(password: string): Promise<string>;
      verify(input: { hash: string; password: string }): Promise<boolean>;
    };
  };
}

async function getAdminUser(email: string): Promise<UserApi> {
  const user = await userRepository.getByEmailIncludingDeleted(email);
  if (!user || user.deletedAt || user.role !== UserRole.ADMIN) {
    throw authenticationFailed();
  }
  return user;
}

async function getAdminUserForSignIn(
  ctx: CredentialContext,
  email: string,
  password: string
): Promise<UserApi> {
  const user = await userRepository.getByEmailIncludingDeleted(email);
  if (!user) {
    await ctx.context.password.hash(password);
    throw authenticationFailed();
  }

  const credentialAccount = (
    await ctx.context.internalAdapter.findAccounts(user.id)
  ).find((account) => account.providerId === 'credential');
  if (!credentialAccount?.password) {
    await ctx.context.password.hash(password);
    throw authenticationFailed();
  }

  const isPasswordValid = await ctx.context.password.verify({
    hash: credentialAccount.password,
    password
  });
  if (!isPasswordValid) {
    throw authenticationFailed();
  }

  if (user.deletedAt || user.role !== UserRole.ADMIN) {
    throw authenticationFailed();
  }

  return user;
}

async function resolveActiveEstablishmentId(
  establishmentId: string
): Promise<string> {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new APIError('UNPROCESSABLE_ENTITY', {
      message: 'Admin sign-in establishment does not exist.'
    });
  }

  return establishment.id;
}

async function sendAdminTwoFactorCode(user: UserApi): Promise<void> {
  if (
    isAccountLocked(
      user.twoFactorLockedUntil ? new Date(user.twoFactorLockedUntil) : null
    )
  ) {
    throw authenticationFailed();
  }

  const code = generateSimpleCode();
  const now = new Date();
  const hashedCode = await hashCode(code);

  await userRepository.update({
    ...user,
    twoFactorCode: hashedCode,
    twoFactorCodeGeneratedAt: now.toJSON(),
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

  await userRepository.recordTwoFactorFailure(
    user.id,
    MAX_FAILED_ATTEMPTS,
    calculateLockoutEnd()
  );

  throw authenticationFailed();
}

async function createAdminSession(
  ctx: Parameters<typeof setSessionCookie>[0],
  user: UserApi,
  establishmentId: string
) {
  const activeEstablishmentId =
    await resolveActiveEstablishmentId(establishmentId);

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
    rateLimit: [
      {
        pathMatcher: (path) => path === '/admin/sign-in',
        window: 60,
        max: 10
      },
      {
        pathMatcher: (path) => path === '/admin/verify-2fa',
        window: 60,
        max: 10
      }
    ],
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
            ctx,
            ctx.body.email,
            ctx.body.password
          );
          await resolveActiveEstablishmentId(ctx.body.establishmentId);

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
          await userRepository.update(updatedUser);
          await createAdminSession(ctx, updatedUser, ctx.body.establishmentId);

          return ctx.json({ status: true });
        }
      )
    }
  };
}
