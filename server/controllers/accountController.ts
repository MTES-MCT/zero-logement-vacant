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
  toUserAccountDTO,
  toUserDTO,
  UserApi,
  UserRoles,
} from '../models/UserApi';
import AuthenticationFailedError from '../errors/authenticationFailedError';
import EstablishmentMissingError from '../errors/establishmentMissingError';
import { emailValidator, passwordCreationValidator } from '../utils/validators';
import PasswordInvalidError from '../errors/passwordInvalidError';
import UnprocessableEntityError from '../errors/unprocessableEntityError';
import UserMissingError from '../errors/userMissingError';
import { UserAccountDTO } from '../../shared/models/UserDTO';

const signInValidators: ValidationChain[] = [
  emailValidator(),
  body('password').isString().notEmpty({ ignore_whitespace: true }),
  body('establishmentId').isString().optional(),
];

interface SignInPayload {
  email: string;
  password: string;
  establishmentId?: string;
}

const signIn = async (request: Request, response: Response) => {
  const payload = request.body as SignInPayload;

  const user = await userRepository.getByEmail(payload.email);
  if (!user) {
    throw new AuthenticationFailedError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationFailedError();
  }

  await userRepository.update({ ...user, lastAuthenticatedAt: new Date() });
  const establishmentId = user.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(user, establishmentId, response);
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

const changeEstablishment = async (request: Request, response: Response) => {
  const { user } = request as AuthenticatedRequest;

  if (user.role !== UserRoles.Admin) {
    throw new AuthenticationFailedError();
  }

  const establishmentId = request.params.establishmentId;

  await signInToEstablishment(user, establishmentId, response);
};

const get = async (request: Request, response: Response): Promise<Response> => {
  const { userId } = (request as AuthenticatedRequest).auth;

  console.log('Get account', userId);

  const user = await userRepository.get(userId);

  if (!user) {
    throw new UserMissingError(userId);
  }

  return response.status(constants.HTTP_STATUS_OK).json(toUserAccountDTO(user));
};

const updateAccountValidators: ValidationChain[] = [
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('phone').isString().notEmpty(),
  body('position').isString().notEmpty(),
  body('timePerWeek').isString().notEmpty(),
];

const updateAccount = async (request: Request, response: Response) => {
  const user = (request as AuthenticatedRequest).user;
  const userAccount = request.body as UserAccountDTO;

  console.log('Update account for ', user.id);

  await userRepository.update({
    ...user,
    ...userAccount,
    updatedAt: new Date(),
  });
  response.status(constants.HTTP_STATUS_OK).send();
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

  const hash = await bcrypt.hash(newPassword, SALT_LENGTH);
  await userRepository.update({ ...user, password: hash });

  response.status(constants.HTTP_STATUS_OK).send();
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

  const user = await userRepository.get(link.userId);

  if (!user) {
    throw new UserMissingError(link.userId);
  }

  const hash = await bcrypt.hash(password, SALT_LENGTH);
  await userRepository.update({ ...user, password: hash });
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
  get,
  updateAccount,
  updateAccountValidators,
  updatePassword,
  updatePasswordValidators,
  resetPassword,
  resetPasswordValidators,
  changeEstablishment,
};
