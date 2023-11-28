import { Request, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { SALT_LENGTH, toUserDTO, UserApi, UserRoles } from '../models/UserApi';
import { constants } from 'http2';
import {
  CampaignIntent,
  hasPriority,
  INTENTS,
} from '../models/EstablishmentApi';
import { body, param, ValidationChain } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import establishmentService from '../services/establishmentService';
import prospectRepository from '../repositories/prospectRepository';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { isValid } from '../models/ProspectApi';
import TestAccountError from '../errors/testAccountError';
import ProspectInvalidError from '../errors/prospectInvalidError';
import ProspectMissingError from '../errors/prospectMissingError';
import mailService from '../services/mailService';
import { isTestAccount } from '../services/ceremaService/consultUserService';
import UserMissingError from '../errors/userMissingError';
import { logger } from '../utils/logger';
import { withinTransaction } from '../middlewares/transaction';
import EstablishmentMissingError from '../errors/establishmentMissingError';

const createUserValidators = [
  body('email').isEmail().withMessage('Must be an email'),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 0,
      minLowercase: 1,
    })
    .withMessage(
      'Must be at least 8 characters long, have 1 number, 1 uppercase, 1 lowercase'
    ),
  body('campaignIntent').isString().isIn(INTENTS).optional(),
  body('establishmentId').isUUID(),
  body('firstName').isString().optional(),
  body('lastName').isString().optional(),
];

interface CreateUserBody {
  email: string;
  password: string;
  establishmentId: string;
  campaignIntent?: CampaignIntent;
  firstName?: string;
  lastName?: string;
}

const createUser = async (request: Request, response: Response) => {
  const body = request.body as CreateUserBody;

  if (isTestAccount(body.email)) {
    throw new TestAccountError(body.email);
  }

  const prospect = await prospectRepository.get(body.email);
  if (!prospect) {
    throw new ProspectMissingError(body.email);
  }
  if (!isValid(prospect)) {
    throw new ProspectInvalidError(prospect);
  }

  const userEstablishment = await establishmentRepository.get(
    body.establishmentId
  );
  if (!userEstablishment) {
    logger.info('Establishment not found for id', body.establishmentId);
    throw new EstablishmentMissingError(body.establishmentId);
  }

  const userApi: UserApi = {
    id: uuidv4(),
    email: body.email,
    password: await bcrypt.hash(body.password, SALT_LENGTH),
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    role: UserRoles.Usual,
    establishmentId: body.establishmentId,
  };

  logger.info('Create user', {
    id: userApi.id,
    email: userApi.email,
    establishmentId: userApi.establishmentId,
  });

  const createdUser = await userRepository.insert(userApi);

  if (!userEstablishment.campaignIntent && body.campaignIntent) {
    userEstablishment.campaignIntent = body.campaignIntent;
    userEstablishment.priority = hasPriority(userEstablishment)
      ? 'high'
      : 'standard';
    await establishmentRepository.update(userEstablishment);
  }

  if (!userEstablishment.available) {
    await establishmentService.makeEstablishmentAvailable(userEstablishment);
  }
  // Remove associated prospect
  await prospectRepository.remove(prospect.email);

  response.status(constants.HTTP_STATUS_CREATED).json(createdUser);
  mailService.emit('user:created', prospect.email, {
    createdAt: new Date(),
  });
};

const get = async (request: Request, response: Response) => {
  const userId = request.params.userId;

  logger.info('Get user', userId);

  const user = await userRepository.get(userId);

  if (!user) {
    throw new UserMissingError(userId);
  }
  response.status(constants.HTTP_STATUS_OK).json(toUserDTO(user));
};

const userIdValidator: ValidationChain[] = [param('userId').isUUID()];

const userController = {
  createUserValidators,
  createUser: withinTransaction(createUser),
  get: withinTransaction(get),
  userIdValidator,
};

export default userController;
