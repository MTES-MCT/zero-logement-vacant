import { NextFunction, Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';
import establishmentRepository from '../repositories/establishmentRepository';
import { Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { body, param, ValidationChain } from 'express-validator';
import ceremaService from '../services/ceremaService';
import prospectRepository from '../repositories/prospectRepository';
import resetLinkRepository from '../repositories/resetLinkRepository';
import ResetLinkMissingError from '../errors/resetLinkMissingError';
import { hasExpired } from '../models/ResetLinkApi';
import ResetLinkExpiredError from '../errors/resetLinkExpiredError';

const signin = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('signin');

  const email = request.body.email;
  const password = request.body.password;

  try {
    const user = await userRepository.getByEmail(email);

    if (!user) {
      console.log('User not found for email', email);
      return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Invalid password for email', email);
      return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
    }

    await userRepository.updateLastAuthentication(user.id);

    const establishmentId =
      user.establishmentId ?? request.body.establishmentId;
    const establishment = await establishmentRepository.get(establishmentId);

    if (!establishment) {
      console.log('Establishment not found for id', establishmentId);
      return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
    }

    return response.status(constants.HTTP_STATUS_OK).send({
      user: { ...user, password: undefined, establishmentId: undefined },
      establishment,
      accessToken: jwt.sign(
        <RequestUser>{
          userId: user.id,
          establishmentId: establishment.id,
          role: user.role,
        },
        config.auth.secret,
        { expiresIn: config.auth.expiresIn }
      ),
    });
  } catch {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }
};

const getAccountValidator: ValidationChain[] = [
  param('email').notEmpty().isEmail(),
];

const getProspectAccount = async (request: Request, response: Response) => {
  const email = request.params.email as string;
  console.log('Get account', email);

  const user = await userRepository.getByEmail(email);

  if (user) {
    console.log('Prospect is already a user for email', email);
    return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
  }

  const ceremaUser = await ceremaService.consultUser(email);
  await prospectRepository.upsert(ceremaUser);

  const prospect = await prospectRepository.get(email);

  return response.status(constants.HTTP_STATUS_OK).json(prospect);
};

const updatePassword = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const userId = (<RequestUser>request.auth).userId;

  const currentPassword = request.body.currentPassword;
  const newPassword = request.body.newPassword;

  console.log('update password for ', userId);

  const user = await userRepository.get(userId);

  if (!user) {
    console.log('User not found for id', userId);
    return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (isPasswordValid) {
    // TODO: avoid hashing password synchronously
    // as it blocks other incoming requests
    return userRepository
      .updatePassword(userId, bcrypt.hashSync(newPassword))
      .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
  } else {
    return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
  }
};

const resetPassword = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { key, password } = request.body;

    const link = await resetLinkRepository.get(key);
    if (!link) {
      throw new ResetLinkMissingError();
    }

    if (hasExpired(link)) {
      throw new ResetLinkExpiredError();
    }

    await userRepository.updatePassword(link.userId, bcrypt.hashSync(password));
    await resetLinkRepository.used(link.id);
    response.sendStatus(constants.HTTP_STATUS_OK);
  } catch (error) {
    next(error);
  }
};
const resetPasswordValidators: ValidationChain[] = [
  body('key').isString().isAlphanumeric(),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 0,
      minLowercase: 1,
    })
    .withMessage(
      'Must have at least 8 characters, 1 number, 1 uppercase, 1 lowercase.'
    ),
];

export default {
  signin,
  getAccountValidator,
  getProspectAccount,
  updatePassword,
  resetPassword,
  resetPasswordValidators,
};
