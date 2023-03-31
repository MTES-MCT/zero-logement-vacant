import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { body, ValidationChain } from 'express-validator';
import resetLinkRepository from '../repositories/resetLinkRepository';
import ResetLinkMissingError from '../errors/resetLinkMissingError';
import { hasExpired } from '../models/ResetLinkApi';
import ResetLinkExpiredError from '../errors/resetLinkExpiredError';
import {
  SALT_LENGTH,
  TokenPayload,
  toUserDTO,
  UserApi,
  UserRoles,
} from '../models/UserApi';
import AuthenticationFailedError from '../errors/authenticationFailedError';
import EstablishmentMissingError from '../errors/establishmentMissingError';
import { emailValidator, passwordCreationValidator } from '../utils/validators';
import PasswordInvalidError from '../errors/passwordInvalidError';

const signInValidators: ValidationChain[] = [
  emailValidator(),
  body('password').isString().notEmpty({ ignore_whitespace: true }),
  body('establishmentId').isString().optional(),
];

const signIn = async (request: Request, response: Response) => {
  const { email, password } = request.body;

  const user = await userRepository.getByEmail(email);
  if (!user) {
    throw new AuthenticationFailedError();
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationFailedError();
  }

  await userRepository.updateLastAuthentication(user.id);
  const establishmentId = user.establishmentId ?? request.body.establishmentId;

  signInToEstablishment(user, establishmentId, response);
};

const signInToEstablishment = async (
  user: UserApi,
  establishmentId: string,
  response: Response
) => {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      establishmentId: establishment.id,
      role: user.role,
    } as TokenPayload,
    config.auth.secret,
    { expiresIn: config.auth.expiresIn }
  );

  response.status(constants.HTTP_STATUS_OK).json({
    user: toUserDTO(user),
    establishment,
    accessToken,
  });
};

const changeEstablishment = (request: Request, response: Response) => {
  const { user } = request as AuthenticatedRequest;

  if (user.role !== UserRoles.Admin) {
    throw new AuthenticationFailedError();
  }

  const establishmentId = request.params.establishmentId;

  signInToEstablishment(user, establishmentId, response);
};

const updatePassword = async (request: Request, response: Response) => {
  const user = (request as AuthenticatedRequest).user;
  const currentPassword = request.body.currentPassword;
  const newPassword = request.body.newPassword;

  console.log('Update password for ', user.id);

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new PasswordInvalidError();
  }

  if (isPasswordValid) {
    const hash = await bcrypt.hash(newPassword, SALT_LENGTH)
    await userRepository.updatePassword(user.id, hash)
    response.sendStatus(constants.HTTP_STATUS_OK)
  } else {
    response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
  }
};
const updatePasswordValidators: ValidationChain[] = [
  body('currentPassword').isString().notEmpty({ ignore_whitespace: true }),
  passwordCreationValidator('newPassword'),
];

const resetPassword = async (request: Request, response: Response) => {
  const { key, password } = request.body;

  const link = await resetLinkRepository.get(key);
  if (!link) {
    throw new ResetLinkMissingError();
  }

  if (hasExpired(link)) {
    throw new ResetLinkExpiredError();
  }

  const hash = await bcrypt.hash(password, SALT_LENGTH);
    await userRepository.updatePassword(link.userId, hash);
  await resetLinkRepository.used(link.id);
  response.sendStatus(constants.HTTP_STATUS_OK);
};
const resetPasswordValidators: ValidationChain[] = [
  body('key').isString().isAlphanumeric(),
  passwordCreationValidator(),
];

export default {
  signIn,
  signInValidators,
  updatePassword,
  updatePasswordValidators,
  resetPassword,
  resetPasswordValidators,
  changeEstablishment,
};
