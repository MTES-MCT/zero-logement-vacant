import { constants } from 'http2';

import { UserAccountDTO, UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { fromNodeHeaders } from 'better-auth/node';
import { Request, Response, type RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import jwt from 'jsonwebtoken';
import { object, string } from 'yup';

import AuthenticationFailedError from '~/errors/authenticationFailedError';
import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ForbiddenError from '~/errors/forbiddenError';
import ResetLinkExpiredError from '~/errors/resetLinkExpiredError';
import ResetLinkMissingError from '~/errors/resetLinkMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import UserDeletedError from '~/errors/userDeletedError';
import UserMissingError from '~/errors/userMissingError';
import { auth } from '~/infra/auth';
import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { hasExpired } from '~/models/ResetLinkApi';
import type { SignInPayload } from '~/models/SignInPayload';
import {
  SALT_LENGTH,
  TokenPayload,
  toUserAccountDTO,
  toUserDTO,
  UserApi
} from '~/models/UserApi';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';
import mailService from '~/services/mailService';
import {
  generateSimpleCode,
  isCodeExpired,
  hashCode,
  verifyHashedCode,
  isAccountLocked,
  calculateLockoutEnd,
  MAX_FAILED_ATTEMPTS
} from '~/services/twoFactorService';

// TODO: remove get, updateAccount
// because they shall be implemented in userController

const signIn: RequestHandler<never, unknown, SignInPayload, never> = async (
  request,
  response
): Promise<void> => {
  const payload = request.body;

  // Use getByEmailIncludingDeleted to be able to detect deleted users
  // and return a proper 403 error instead of 401
  const user = await userRepository.getByEmailIncludingDeleted(payload.email);
  if (!user) {
    throw new AuthenticationFailedError();
  }

  // Check if user account is deleted before password validation
  // to return proper 403 error for deleted accounts
  if (user.deletedAt) {
    logger.warn('Login attempt on deleted account', {
      userId: user.id,
      email: user.email,
      deletedAt: user.deletedAt
    });
    throw new UserDeletedError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationFailedError();
  }

  // Log suspended account login (but allow login - frontend will show modal)
  if (user.suspendedAt) {
    logger.info('Login on suspended account - modal will be displayed', {
      userId: user.id,
      email: user.email,
      suspendedAt: user.suspendedAt,
      suspendedCause: user.suspendedCause
    });
    // Note: We don't throw an error here anymore.
    // The login proceeds and the frontend displays the suspension modal
    // based on user.suspendedAt and user.suspendedCause
  }

  // Check if 2FA is required for admin users
  if (user.role === UserRole.ADMIN && config.auth.admin2faEnabled) {
    logger.info('Admin user detected, generating 2FA code', {
      userId: user.id
    });

    // Generate and send 2FA code
    const code = generateSimpleCode();
    const now = new Date();

    // Hash the code before storing
    const hashedCode = await hashCode(code);

    await userRepository.update({
      ...user,
      twoFactorCode: hashedCode,
      twoFactorCodeGeneratedAt: now.toJSON(),
      // Reset failed attempts on new code generation
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null
    });

    // Send code via email (plain text, only to user's email)
    await mailService.sendTwoFactorCode(code, {
      recipients: [user.email]
    });

    logger.info('2FA code sent to admin user', {
      userId: user.id,
      email: user.email,
      action: '2fa_code_sent'
    });

    // Return response indicating 2FA is required
    response.status(constants.HTTP_STATUS_OK).json({
      requiresTwoFactor: true,
      email: user.email
    });
    return;
  }

  // For non-admin users, proceed with normal login
  // Fetch and update user kind from Portail DF API
  const kind = await fetchUserKind(user.email);

  const updatedUser: UserApi = {
    ...user,
    kind,
    lastAuthenticatedAt: new Date().toJSON()
  };

  await userRepository.update(updatedUser);

  logger.info('User signed in', {
    userId: user.id,
    email: user.email,
    kind
  });

  const establishmentId =
    updatedUser.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(updatedUser, establishmentId, response);
};

async function signInToEstablishment(
  user: UserApi,
  establishmentId: string,
  response: Response
) {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  // Refresh authorized establishments and save perimeter from Portail DF at login
  // This MUST complete before returning the token to ensure perimeter filtering works
  await refreshAuthorizedEstablishments(user);

  // Get authorized establishments for multi-structure dropdown (after refresh)
  const authorizedEstablishmentLinks =
    await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
  const authorizedEstablishmentIds = authorizedEstablishmentLinks
    .filter((e) => e.hasCommitment)
    .map((e) => e.establishmentId);

  // Fetch full establishment details for authorized establishments
  let authorizedEstablishments: Awaited<
    ReturnType<typeof establishmentRepository.find>
  > = [];
  if (authorizedEstablishmentIds.length > 1) {
    authorizedEstablishments = await establishmentRepository.find({
      filters: { id: authorizedEstablishmentIds }
    });
  }

  // Compute effective geoCodes based on user's perimeter
  // ADMIN and VISITOR users have no restriction (effectiveGeoCodes = undefined)
  let effectiveGeoCodes: string[] | undefined;
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const userPerimeter = await userPerimeterRepository.get(user.id);
    effectiveGeoCodes = await filterGeoCodesByPerimeter(
      establishment.geoCodes,
      userPerimeter,
      establishment.siren
    );
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      establishmentId: establishment.id,
      role: user.role
    } as TokenPayload,
    config.auth.secret,
    { expiresIn: config.auth.expiresIn }
  );

  response.status(constants.HTTP_STATUS_OK).json({
    user: toUserDTO(user),
    establishment,
    accessToken,
    // Include authorized establishments for multi-structure users
    ...(authorizedEstablishments.length > 1 && { authorizedEstablishments }),
    // Include effective geoCodes for perimeter filtering (undefined = no restriction)
    effectiveGeoCodes
  });
}

async function changeEstablishment(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const establishmentId = request.params.establishmentId;

  // ADMIN and VISITOR can change to any establishment
  if (user.role === UserRole.ADMIN || user.role === UserRole.VISITOR) {
    await signInToEstablishment(user, establishmentId, response);
    return;
  }

  // USUAL users can only change to their authorized establishments
  const authorizedEstablishments =
    await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
  const authorizedIds = authorizedEstablishments
    .filter((e) => e.hasCommitment)
    .map((e) => e.establishmentId);

  if (!authorizedIds.includes(establishmentId)) {
    logger.warn('USUAL user tried to change to unauthorized establishment', {
      userId: user.id,
      email: user.email,
      requestedEstablishment: establishmentId,
      authorizedEstablishments: authorizedIds
    });
    throw new AuthenticationFailedError();
  }

  // Update user's current establishment
  await userRepository.update({
    ...user,
    establishmentId,
    updatedAt: new Date().toJSON()
  });

  await signInToEstablishment(user, establishmentId, response);
}

/**
 * Session-based equivalent of {@link changeEstablishment}.
 *
 * Requires a better-auth session cookie. Updates the active establishment
 * stored on the session row via `auth.api.updateSession` — no JWT is
 * issued, the response carries only the new establishment context.
 *
 * Legacy clients using `x-access-token` should keep calling the GET route.
 */
async function changeEstablishmentBySession(
  request: Request,
  response: Response
): Promise<void> {
  const cookieHeader = request.headers.cookie ?? '';
  if (!cookieHeader.includes('zlv.session_token')) {
    response.status(constants.HTTP_STATUS_METHOD_NOT_ALLOWED).json({
      message:
        'POST requires a session cookie; legacy clients should use GET'
    });
    return;
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  if (!session) {
    throw new AuthenticationMissingError();
  }

  const { user } = request as AuthenticatedRequest;
  const establishmentId = request.params.establishmentId;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const authorised =
      await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
    const authorisedIds = authorised
      .filter((e) => e.hasCommitment)
      .map((e) => e.establishmentId);
    if (!authorisedIds.includes(establishmentId)) {
      logger.warn('User tried to switch to unauthorised establishment', {
        userId: user.id,
        requestedEstablishment: establishmentId,
        authorisedEstablishments: authorisedIds
      });
      throw new ForbiddenError();
    }
  }

  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  // better-auth's update-session route accepts a flat record of session
  // additional fields. `activeEstablishmentId` is declared on the auth
  // config (~/infra/auth.ts), so it's a valid update target.
  await auth.api.updateSession({
    headers: fromNodeHeaders(request.headers),
    body: { activeEstablishmentId: establishmentId }
  });

  let effectiveGeoCodes: string[] | undefined;
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const userPerimeter = await userPerimeterRepository.get(user.id);
    effectiveGeoCodes = await filterGeoCodesByPerimeter(
      establishment.geoCodes,
      userPerimeter,
      establishment.siren
    );
  }

  response.status(constants.HTTP_STATUS_OK).json({
    establishment,
    effectiveGeoCodes
  });
}

async function get(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  logger.info('Get account', auth.userId);

  const user = await userRepository.get(auth.userId);

  if (!user) {
    throw new UserMissingError(auth.userId);
  }

  response.status(constants.HTTP_STATUS_OK).json(toUserAccountDTO(user));
}

const updateAccountSchema = object({
  firstName: string().strict(true).required(),
  lastName: string().strict(true).required(),
  phone: string().strict(true).required(),
  position: string().strict(true).required(),
  timePerWeek: string().strict(true).required()
});

const updateAccountValidators = {
  body: updateAccountSchema
};

/**
 * @deprecated Use {@link userController.update} instead
 * @param request
 * @param response
 */
async function updateAccount(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const account = request.body as UserAccountDTO;

  logger.info('Update account for ', user.id);

  await userRepository.update({
    ...user,
    ...account,
    updatedAt: new Date().toJSON()
  });
  response.status(constants.HTTP_STATUS_OK).send();
}

const resetPasswordSchema = object({
  key: string()
    .required()
    .matches(/^[a-zA-Z0-9]+$/),
  password: string()
    .required()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .matches(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .matches(
      /[^A-Za-z0-9]/,
      'Le mot de passe doit contenir au moins un caractère spécial'
    )
});

const resetPasswordValidators = {
  body: resetPasswordSchema
};

async function resetPassword(request: Request, response: Response) {
  const { key, password } = request.body;

  const link = await resetLinkRepository.get(key);
  if (!link) {
    throw new ResetLinkMissingError();
  }

  if (hasExpired(link)) {
    throw new ResetLinkExpiredError();
  }

  const user = await userRepository.get(link.userId);

  if (!user) {
    throw new UserMissingError(link.userId);
  }

  const hash = await bcrypt.hash(password, SALT_LENGTH);
  await userRepository.update({ ...user, password: hash });
  await resetLinkRepository.used(link.id);
  response.sendStatus(constants.HTTP_STATUS_OK);
}

const verifyTwoFactorSchema = object({
  email: string().required().email(),
  code: string()
    .required()
    .length(6)
    .matches(/^\d{6}$/),
  establishmentId: string().optional()
});

const verifyTwoFactorValidators = {
  body: verifyTwoFactorSchema
};

interface VerifyTwoFactorPayload {
  email: string;
  code: string;
  establishmentId?: string;
}

async function verifyTwoFactor(request: Request, response: Response) {
  const payload = request.body as VerifyTwoFactorPayload;

  const user = await userRepository.getByEmail(payload.email);
  if (!user) {
    logger.warn('2FA verification attempted for non-existent user', {
      email: payload.email,
      action: '2fa_verify_failed',
      reason: 'user_not_found'
    });
    throw new AuthenticationFailedError();
  }

  // Check if user is admin
  if (user.role !== UserRole.ADMIN) {
    logger.warn('2FA verification attempted by non-admin user', {
      userId: user.id,
      action: '2fa_verify_failed',
      reason: 'not_admin'
    });
    throw new AuthenticationFailedError();
  }

  // Check if account is locked
  if (
    isAccountLocked(
      user.twoFactorLockedUntil ? new Date(user.twoFactorLockedUntil) : null
    )
  ) {
    logger.warn('2FA verification attempted on locked account', {
      userId: user.id,
      lockedUntil: user.twoFactorLockedUntil,
      action: '2fa_verify_failed',
      reason: 'account_locked'
    });
    throw new AuthenticationFailedError();
  }

  // Check if code exists
  if (!user.twoFactorCode || !user.twoFactorCodeGeneratedAt) {
    logger.warn('2FA verification attempted without code', {
      userId: user.id,
      action: '2fa_verify_failed',
      reason: 'no_code'
    });
    throw new AuthenticationFailedError();
  }

  // Check if code has expired
  if (isCodeExpired(new Date(user.twoFactorCodeGeneratedAt))) {
    logger.warn('2FA code expired', {
      userId: user.id,
      generatedAt: user.twoFactorCodeGeneratedAt,
      action: '2fa_verify_failed',
      reason: 'expired'
    });
    throw new AuthenticationFailedError();
  }

  // Verify code against hashed version
  const isValidCode = await verifyHashedCode(payload.code, user.twoFactorCode);

  if (!isValidCode) {
    const failedAttempts = user.twoFactorFailedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    logger.warn('2FA code mismatch', {
      userId: user.id,
      failedAttempts,
      shouldLock,
      action: '2fa_verify_failed',
      reason: 'invalid_code'
    });

    // Update failed attempts and lock if necessary
    await userRepository.update({
      ...user,
      twoFactorFailedAttempts: failedAttempts,
      twoFactorLockedUntil: shouldLock
        ? calculateLockoutEnd().toJSON()
        : user.twoFactorLockedUntil
    });

    throw new AuthenticationFailedError();
  }

  logger.info('2FA code verified successfully', {
    userId: user.id,
    email: user.email,
    action: '2fa_verify_success'
  });

  // Fetch and update user kind from Portail DF API
  const kind = await fetchUserKind(user.email);

  // Clear the 2FA code and reset counters
  const updatedUser: UserApi = {
    ...user,
    kind,
    twoFactorCode: null,
    twoFactorCodeGeneratedAt: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    lastAuthenticatedAt: new Date().toJSON()
  };

  await userRepository.update(updatedUser);

  logger.info('Admin user signed in after 2FA', {
    userId: user.id,
    email: user.email,
    kind
  });

  // Complete the sign-in process
  const establishmentId =
    updatedUser.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(updatedUser, establishmentId, response);
}

export default {
  signIn,
  verifyTwoFactor,
  verifyTwoFactorSchema,
  verifyTwoFactorValidators,
  get,
  updateAccount,
  updateAccountSchema,
  updateAccountValidators,
  resetPassword,
  resetPasswordSchema,
  resetPasswordValidators,
  changeEstablishment,
  changeEstablishmentBySession
};
