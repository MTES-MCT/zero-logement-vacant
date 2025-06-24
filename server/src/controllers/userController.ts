import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ProspectInvalidError from '~/errors/prospectInvalidError';
import ProspectMissingError from '~/errors/prospectMissingError';
import TestAccountError from '~/errors/testAccountError';
import UserMissingError from '~/errors/userMissingError';
import { logger } from '~/infra/logger';
import { isValid } from '~/models/ProspectApi';
import { SALT_LENGTH, toUserDTO, UserApi } from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import prospectRepository from '~/repositories/prospectRepository';
import userRepository from '~/repositories/userRepository';
import { isTestAccount } from '~/services/ceremaService/consultUserService';
import mailService from '~/services/mailService';

const createUserValidators = [
  body('email').isEmail().withMessage('Must be an email'),
  body('password')
    .isStrongPassword({
      minLength: 12,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 0,
      minLowercase: 1
    })
    .withMessage(
      'Must be at least 12 characters long, have 1 number, 1 uppercase, 1 lowercase'
    ),
  body('establishmentId').isUUID(),
  body('firstName').isString().optional(),
  body('lastName').isString().optional()
];

interface CreateUserBody {
  email: string;
  password: string;
  establishmentId: string;
  firstName?: string;
  lastName?: string;
}

async function createUser(request: Request, response: Response) {
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
    throw new EstablishmentMissingError(body.establishmentId);
  }

  const user: UserApi = {
    id: uuidv4(),
    email: body.email,
    password: await bcrypt.hash(body.password, SALT_LENGTH),
    // TODO: should be optional in database
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    role:
      userEstablishment.geoCodes.length === 0
        ? UserRole.VISITOR
        : UserRole.ADMIN,
    establishmentId: body.establishmentId
  };

  logger.info('Create user', {
    id: user.id,
    email: user.email,
    establishmentId: user.establishmentId
  });

  const createdUser = await userRepository.insert(user);

  if (!userEstablishment.available) {
    await establishmentRepository.setAvailable(userEstablishment);
  }
  // Remove associated prospect
  await prospectRepository.remove(prospect.email);

  response.status(constants.HTTP_STATUS_CREATED).json(createdUser);
  mailService.emit('user:created', prospect.email, {
    createdAt: new Date()
  });
}

async function get(request: Request, response: Response): Promise<Response> {
  const userId = request.params.userId;

  logger.info('Get user', userId);

  const user = await userRepository.get(userId);
  if (!user) {
    throw new UserMissingError(userId);
  }

  return response.status(constants.HTTP_STATUS_OK).json(toUserDTO(user));
}

const userIdValidator: ValidationChain[] = [param('userId').isUUID()];

const userController = {
  createUserValidators,
  createUser,
  get,
  userIdValidator
};

export default userController;
