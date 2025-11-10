import { UserAccountDTO, UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import jwt from 'jsonwebtoken';
import AuthenticationFailedError from '~/errors/authenticationFailedError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ResetLinkExpiredError from '~/errors/resetLinkExpiredError';
import ResetLinkMissingError from '~/errors/resetLinkMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { hasExpired } from '~/models/ResetLinkApi';
import {
  SALT_LENGTH,
  TokenPayload,
  toUserAccountDTO,
  toUserDTO,
  UserApi
} from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import userRepository from '~/repositories/userRepository';
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
import { emailValidator, passwordCreationValidator } from '~/utils/validators';

// TODO: rename the file to authController.ts
// TODO: remove get, updateAccount
// because they shall be implemented in userController

const signInValidators: ValidationChain[] = [
  emailValidator(),
  body('password').isString().notEmpty({ ignore_whitespace: true }),
  body('establishmentId').isString().optional()
];

interface SignInPayload {
  email: string;
  password: string;
  establishmentId?: string;
}

async function signIn(request: Request, response: Response) {
  const payload = request.body as SignInPayload;

  const user = await userRepository.getByEmail(payload.email);
  if (!user) {
    throw new AuthenticationFailedError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationFailedError();
  }

  // Check if 2FA is required for admin users
  if (user.role === UserRole.ADMIN) {
    logger.info('Admin user detected, generating 2FA code', { userId: user.id });

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
  await userRepository.update({
    ...user,
    lastAuthenticatedAt: new Date().toJSON()
  });
  const establishmentId = user.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(user, establishmentId, response);
}

async function signInToEstablishment(
  user: UserApi,
  establishmentId: string,
  response: Response
) {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
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
    accessToken
  });
}

async function changeEstablishment(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    throw new AuthenticationFailedError();
  }

  const establishmentId = request.params.establishmentId;

  await signInToEstablishment(user, establishmentId, response);
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

const updateAccountValidators: ValidationChain[] = [
  body('firstName').isString(),
  body('lastName').isString(),
  body('phone').isString(),
  body('position').isString(),
  body('timePerWeek').isString()
];

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
const resetPasswordValidators: ValidationChain[] = [
  body('key').isString().isAlphanumeric(),
  passwordCreationValidator()
];

const verifyTwoFactorValidators: ValidationChain[] = [
  emailValidator(),
  body('code').isString().isLength({ min: 6, max: 6 }),
  body('establishmentId').isString().optional()
];

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
  if (isAccountLocked(user.twoFactorLockedUntil ? new Date(user.twoFactorLockedUntil) : null)) {
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
      twoFactorLockedUntil: shouldLock ? calculateLockoutEnd().toJSON() : user.twoFactorLockedUntil
    });

    throw new AuthenticationFailedError();
  }

  logger.info('2FA code verified successfully', {
    userId: user.id,
    email: user.email,
    action: '2fa_verify_success'
  });

  // Clear the 2FA code and reset counters
  await userRepository.update({
    ...user,
    twoFactorCode: null,
    twoFactorCodeGeneratedAt: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    lastAuthenticatedAt: new Date().toJSON()
  });

  // Complete the sign-in process
  const establishmentId = user.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(user, establishmentId, response);
}

export default {
  signIn,
  signInValidators,
  verifyTwoFactor,
  verifyTwoFactorValidators,
  get,
  updateAccount,
  updateAccountValidators,
  resetPassword,
  resetPasswordValidators,
  changeEstablishment
};
