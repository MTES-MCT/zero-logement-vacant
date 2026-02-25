import {
  isAdmin,
  UserRole,
  type UserDTO,
  type UserFilters,
  type UserUpdatePayload
} from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Request, Response, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ForbiddenError from '~/errors/forbiddenError';
import PasswordInvalidError from '~/errors/passwordInvalidError';
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
import ceremaService from '~/services/ceremaService';
import { isTestAccount } from '~/services/ceremaService/consultUserService';
import {
  verifyAccessRights,
  accessErrorsToSuspensionCause
} from '~/services/ceremaService/perimeterService';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import mailService from '~/services/mailService';

type ListQuery = UserFilters;

const list: RequestHandler<
  never,
  ReadonlyArray<UserDTO>,
  never,
  ListQuery
> = async (request, response) => {
  const { query, user, establishment } = request as AuthenticatedRequest<
    never,
    ReadonlyArray<UserDTO>,
    never,
    ListQuery
  >;
  logger.info('List users', {
    query
  });

  const users = await userRepository.find({
    filters: {
      establishments: isAdmin(user) ? query.establishments : [establishment.id]
    },
    pagination: {
      paginate: false
    }
  });

  response.status(constants.HTTP_STATUS_OK).json(users.map(toUserDTO));
};

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

async function create(request: Request, response: Response) {
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

  // Re-verify Portail DF rights at account creation time
  // The prospect may have been created some time ago and rights may have changed
  const ceremaUsers = await ceremaService.consultUsers(body.email);

  // Find the user entry matching this establishment
  // Note: '*' is a wildcard SIREN used in mock service for tests
  const matchingCeremaUser = ceremaUsers.find(
    (user) => user.establishmentSiren === userEstablishment.siren || user.establishmentSiren === '*'
  );

  if (!matchingCeremaUser) {
    logger.warn('No matching Portail DF user found for establishment', {
      email: body.email,
      establishmentId: body.establishmentId,
      establishmentSiren: userEstablishment.siren,
      ceremaUsers
    });
    throw new ProspectInvalidError(prospect);
  }

  // Check structure LOVAC commitment (acces_lovac date in future)
  if (!matchingCeremaUser.hasCommitment) {
    logger.warn('User does not have valid LOVAC commitment at account creation', {
      email: body.email,
      establishmentId: body.establishmentId,
      establishmentSiren: userEstablishment.siren
    });
    throw new ProspectInvalidError(prospect);
  }

  // Verify access rights: LOVAC access level and geographic perimeter (pass SIREN for EPCI perimeter check)
  const accessRights = verifyAccessRights(
    matchingCeremaUser,
    userEstablishment.geoCodes,
    userEstablishment.siren
  );

  if (!accessRights.isValid) {
    logger.warn('User access rights verification failed at account creation', {
      email: body.email,
      establishmentId: body.establishmentId,
      errors: accessRights.errors,
      suspensionCause: accessErrorsToSuspensionCause(accessRights.errors)
    });
    throw new ProspectInvalidError(prospect);
  }

  // Fetch user kind from Portail DF API
  const kind = await fetchUserKind(body.email);

  const user: UserApi = {
    id: uuidv4(),
    email: body.email,
    password: await bcrypt.hash(body.password, SALT_LENGTH),
    firstName: body.firstName ?? null,
    lastName: body.lastName ?? null,
    role:
      userEstablishment.geoCodes.length === 0
        ? UserRole.VISITOR
        : UserRole.USUAL,
    establishmentId: body.establishmentId,
    phone: null,
    position: null,
    timePerWeek: null,
    activatedAt: new Date().toJSON(),
    lastAuthenticatedAt: null,
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: new Date().toJSON(),
    deletedAt: null,
    kind,
    twoFactorSecret: null,
    twoFactorEnabledAt: null,
    twoFactorCode: null,
    twoFactorCodeGeneratedAt: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null
  };

  logger.info('Create user', {
    id: user.id,
    email: user.email,
    establishmentId: user.establishmentId,
    kind
  });

  const createdUser = await userRepository.insert(user);

  // Populate users_establishments with all establishments the user has access to
  // Filter Cerema users that have LOVAC commitment and find matching establishments
  const ceremaUsersWithCommitment = ceremaUsers.filter((cu) => cu.hasCommitment);
  // Filter out the wildcard SIREN '*' used in mock tests (not a valid SIREN for DB queries)
  const establishmentSirens = ceremaUsersWithCommitment
    .map((cu) => cu.establishmentSiren)
    .filter((siren) => siren !== '*');

  // Find all known establishments matching the SIRENs
  const knownEstablishments = establishmentSirens.length > 0
    ? await establishmentRepository.find({
        filters: { siren: establishmentSirens }
      })
    : [];

  // Create authorized establishments entries
  const authorizedEstablishments = knownEstablishments.map((est) => {
    const ceremaUser = ceremaUsersWithCommitment.find(
      (cu) => cu.establishmentSiren === est.siren || cu.establishmentSiren === '*'
    );
    return {
      establishmentId: est.id,
      establishmentSiren: est.siren,
      hasCommitment: ceremaUser?.hasCommitment ?? false
    };
  });

  // Store authorized establishments (multi-structure support)
  if (authorizedEstablishments.length > 0) {
    await userRepository.setAuthorizedEstablishments(
      createdUser.id,
      authorizedEstablishments
    );

    const isMultiStructure = authorizedEstablishments.filter((e) => e.hasCommitment).length > 1;
    if (isMultiStructure) {
      logger.info('User created as multi-structure user', {
        userId: createdUser.id,
        email: createdUser.email,
        authorizedEstablishmentsCount: authorizedEstablishments.length
      });
    }
  }

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

interface PathParams extends Record<string, string> {
  id: string;
}

const get: RequestHandler<PathParams, UserDTO> = async (
  request,
  response
): Promise<void> => {
  const { params } = request;
  logger.info('Get user', {
    id: params.id
  });

  const user = await userRepository.get(params.id);
  if (!user) {
    throw new UserMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(toUserDTO(user));
};

const update: RequestHandler<PathParams, UserDTO, UserUpdatePayload> = async (
  request,
  response
): Promise<void> => {
  const {
    user: authUser,
    body,
    params
  } = request as AuthenticatedRequest<PathParams, UserDTO, UserUpdatePayload>;
  logger.info('Update user', {
    id: params.id
  });

  if (authUser.role === UserRole.USUAL && authUser.id !== params.id) {
    throw new ForbiddenError();
  }

  const user = await userRepository.get(params.id);
  if (!user) {
    throw new UserMissingError(params.id);
  }

  // When a password change is requested, the current password
  // must be provided and valid. Also, passwords must match.
  const passwordEquals = body.password
    ? await bcrypt.compare(body.password.before, user.password)
    : false;
  if (body.password && !passwordEquals) {
    throw new PasswordInvalidError();
  }

  const password = body.password
    ? {
        password: await bcrypt.hash(body.password.after, SALT_LENGTH)
      }
    : {};

  const updated: UserApi = {
    ...user,
    ...password,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    position: body.position,
    timePerWeek: body.timePerWeek,
    updatedAt: new Date().toJSON()
  };
  await userRepository.update(updated);

  response.status(constants.HTTP_STATUS_OK).json(toUserDTO(updated));
};

const remove: RequestHandler<PathParams, void> = async (
  request,
  response
): Promise<void> => {
  const { params } = request as AuthenticatedRequest<PathParams, void>;
  logger.info('Remove user', {
    id: params.id
  });

  const user = await userRepository.get(params.id);
  if (!user) {
    throw new UserMissingError(params.id);
  }

  // Authorization is checked by the route middleware
  await userRepository.remove(params.id);

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const userIdValidator: ValidationChain[] = [param('userId').isUUID()];

const userController = {
  list,
  createUserValidators,
  create,
  get,
  update,
  remove,
  userIdValidator
};

export default userController;
