import { Request, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { SALT_LENGTH, toUserDTO, UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { AuthenticatedRequest } from 'express-jwt';
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
import ForbiddenError from '../errors/forbiddenError';
import UserMissingError from '../errors/userMissingError';
import EstablishmentMissingError from '../errors/establishmentMissingError';
import pagination from '../models/PaginationApi';
import { isArrayOf, isString } from '../utils/validators';

import { isPartial, Paginated } from '../../shared/models/Pagination';
import { UserDTO } from '../../shared/models/UserDTO';
import { isTestAccount } from '../services/ceremaService/consultUserService';

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

const createUser = async (request: Request, response: Response<UserDTO>) => {
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

  const establishment = await establishmentRepository.get(body.establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(body.establishmentId);
  }

  const user: UserApi = {
    id: uuidv4(),
    email: body.email,
    password: await bcrypt.hash(body.password, SALT_LENGTH),
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    role: UserRoles.Usual,
    establishmentId: body.establishmentId,
    activatedAt: new Date(),
  };

  console.log('Create user', {
    id: user.id,
    email: user.email,
    establishmentId: user.establishmentId,
  });

  await userRepository.insert(user);

  if (!establishment.campaignIntent && body.campaignIntent) {
    establishment.campaignIntent = body.campaignIntent;
    establishment.priority = hasPriority(establishment) ? 'high' : 'standard';
    await establishmentRepository.update(establishment);
  }

  if (!establishment.available) {
    await establishmentService.makeEstablishmentAvailable(establishment);
  }
  // Remove associated prospect
  await prospectRepository.remove(prospect.email);

  response.status(constants.HTTP_STATUS_CREATED).json(toUserDTO(user));
  mailService.emit('user:created', prospect.email, {
    createdAt: new Date(),
  });
};

const listUsersValidators: ValidationChain[] = [
  ...pagination.bodyValidators,
  body('filters').default({}).isObject({ strict: true }),
  body('filters.establishmentIds')
    .default([])
    .isArray()
    .custom(isArrayOf(isString)),
];

const listUsers = async (
  request: Request,
  response: Response<Paginated<UserDTO>>
) => {
  console.log('List users');

  const { auth, body, user } = request as AuthenticatedRequest;
  const bodyFilters: UserFiltersApi = body.filters ?? {};

  const filters = {
    ...bodyFilters,
    establishmentIds:
      user.role === UserRoles.Admin
        ? bodyFilters.establishmentIds
        : [auth.establishmentId],
  };

  const page = await userRepository.listWithFilters(
    filters,
    auth.role === UserRoles.Admin
      ? {}
      : { establishmentIds: [auth.establishmentId] },
    pagination.create(body)
  );
  const status = isPartial(page)
    ? constants.HTTP_STATUS_PARTIAL_CONTENT
    : constants.HTTP_STATUS_OK;
  response.status(status).json({
    ...page,
    entities: page.entities.map(toUserDTO),
  });
};

const removeUser = async (request: Request, response: Response<void>) => {
  console.log('Remove user');

  const role = (request as AuthenticatedRequest).user.role;
  if (role !== UserRoles.Admin) {
    throw new ForbiddenError();
  }

  const { userId } = request.params;
  const user = await userRepository.get(userId);
  if (!user) {
    console.log('User not found for id', userId);
    throw new UserMissingError(userId);
  }

  await userRepository.remove(user.id);
  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const userIdValidator: ValidationChain[] = [param('userId').isUUID()];

const userController = {
  createUserValidators,
  createUser,
  listUsersValidators,
  listUsers,
  removeUser,
  userIdValidator,
};

export default userController;
