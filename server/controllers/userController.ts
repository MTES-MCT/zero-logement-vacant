import { NextFunction, Request, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { AuthenticatedRequest, Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { CampaignIntent, INTENTS } from '../models/EstablishmentApi';
import { body, param, ValidationChain } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import establishmentService from '../services/establishmentService';
import prospectRepository from '../repositories/prospectRepository';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { isTestAccount, isValid } from '../models/ProspectApi';
import TestAccountError from '../errors/testAccountError';
import ProspectInvalidError from '../errors/prospectInvalidError';
import ProspectMissingError from '../errors/prospectMissingError';

const SALT = 10;

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

const createUser = async (request: JWTRequest, response: Response) => {
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
    console.log('Establishment not found for id', body.establishmentId);
    return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
  }

  const userApi: UserApi = {
    id: uuidv4(),
    email: body.email,
    password: await bcrypt.hash(body.password, SALT),
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    role: UserRoles.Usual,
    establishmentId: body.establishmentId,
  };

  console.log('Create user', {
    id: userApi.id,
    email: userApi.email,
    establishmentId: userApi.establishmentId,
  });

  const createdUser = await userRepository.insert(userApi);

  if (!userEstablishment.campaignIntent && body.campaignIntent) {
    userEstablishment.campaignIntent = body.campaignIntent;
    await establishmentRepository.update(userEstablishment);
  }

  if (!userEstablishment.available) {
    await establishmentService.makeEstablishmentAvailable(userEstablishment);
  }
  // Remove associated prospect
  await prospectRepository.remove(body.email);

  response.status(constants.HTTP_STATUS_CREATED).json(createdUser);
};

const list = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('List users');

  const page = request.body.page;
  const perPage = request.body.perPage;
  const role = (request as AuthenticatedRequest).user.role;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const bodyFilters = <UserFiltersApi>request.body.filters ?? {};

  const filters = {
    ...bodyFilters,
    establishmentIds:
      role === UserRoles.Admin
        ? bodyFilters.establishmentIds
        : [establishmentId],
  };

  return userRepository
    .listWithFilters(
      filters,
      role === UserRoles.Admin ? {} : { establishmentIds: [establishmentId] },
      page,
      perPage
    )
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const removeUser = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    console.log('Remove user');

    const role = (request as AuthenticatedRequest).user.role;
    if (role !== UserRoles.Admin) {
      return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
    }

    const { userId } = request.params;
    const user = await userRepository.get(userId);

    if (!user) {
      console.log('User not found for id', userId);
      return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
    }

    await userRepository.remove(user.id);

    response.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
  } catch (error) {
    next(error);
  }
};

const userIdValidator: ValidationChain[] = [param('userId').isUUID()];

const userController = {
  createUserValidators,
  createUser,
  list,
  removeUser,
  userIdValidator,
};

export default userController;
