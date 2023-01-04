import { NextFunction, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { RequestUser, UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { Request as JWTRequest } from 'express-jwt';
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
import ceremaService from '../services/ceremaService';

const SALT = 10;

const createUserValidators = [
  body('email').isEmail(),
  body('password').isStrongPassword({
    minLength: 8,
    minNumbers: 1,
    minUppercase: 1,
    minSymbols: 0,
    minLowercase: 1,
  }),
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

const createUser = async (
  request: JWTRequest,
  response: Response,
  next: NextFunction
) => {
  try {
    const body = request.body as CreateUserBody;

    if (isTestAccount(body.email)) {
      throw new TestAccountError(body.email);
    }

    const prospect =
      (await prospectRepository.get(body.email)) ??
      (await ceremaService.consultUser(body.email));
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
  } catch (error) {
    next(error);
  }
};

const list = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  console.log('List users');

  const page = request.body.page;
  const perPage = request.body.perPage;
  const role = (<RequestUser>request.auth).role;
  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const bodyFilters = <UserFiltersApi>request.body.filters ?? {};

  const filters = {
    ...bodyFilters,
    establishmentIds:
      role === UserRoles.Admin
        ? bodyFilters.establishmentIds
        : [establishmentId],
  };

  return userRepository
    .listWithFilters(filters, page, perPage)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const removeUser = async (
  request: JWTRequest,
  response: Response,
  next: NextFunction
) => {
  try {
    console.log('Remove user');

    const role = (<RequestUser>request.auth).role;
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
