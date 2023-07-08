import { body, param, query, ValidationChain } from 'express-validator';
import { Request, Response } from 'express';
import { constants } from 'http2';
import { AuthenticatedRequest } from 'express-jwt';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import {
  OwnerProspectApi,
  OwnerProspectCreateApi,
  OwnerProspectSortableApi,
  OwnerProspectUpdateApi,
} from '../models/OwnerProspectApi';
import ownerProspectRepository from '../repositories/ownerProspectRepository';
import pagination, { createPagination } from '../models/PaginationApi';
import { isPartial } from '../models/PaginatedResultApi';
import SortApi from '../models/SortApi';
import OwnerProspectMissingError from '../errors/ownerProspectMissingError';
import mailService from '../services/mailService';
import establishmentRepository from '../repositories/establishmentRepository';
import userRepository from '../repositories/userRepository';
import { UserApi } from '../models/UserApi';
import { Pagination } from '../../shared/models/Pagination';

const createOwnerProspectValidators: ValidationChain[] = [
  body('email').isEmail().withMessage('Must be an email'),
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('address').isString().notEmpty(),
  body('invariant').isString().optional(),
  body('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 }),
  body('phone').isString().notEmpty(),
  body('notes').isString().optional(),
];

const create = async (request: Request, response: Response) => {
  const body = request.body as OwnerProspectCreateApi;

  const createdOwnerProspect = await ownerProspectRepository.insert({
    ...body,
    id: uuidv4(),
    createdAt: new Date(),
    callBack: true,
    read: false,
  });
  response.status(constants.HTTP_STATUS_CREATED).json(createdOwnerProspect);

  try {
    // Optional steps
    const establishments = await establishmentRepository.listWithFilters({
      available: true,
      geoCodes: [body.geoCode],
    });
    if (establishments.length > 0) {
      const byEstablishment = {
        establishmentIds: establishments.map((_) => _.id),
      };

      const users = await userRepository.find({
        filters: byEstablishment,
        pagination: {
          paginate: false,
        },
      });

      const sendEmails = fp.pipe(
        fp.groupBy('establishmentId'),
        fp.mapValues(
          (users: UserApi[]): Promise<void> =>
            mailService.sendOwnerProspectCreatedEmail(users)
        ),
        Object.values
      );
      await Promise.all(sendEmails(users));
    }
  } catch (error) {
    console.error(error);
  }
};

export const findOwnerProspectsValidators: ValidationChain[] = [
  query('sort')
    .default('address')
    .escape()
    .whitelist('-,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
    .matches(/^-?[a-zA-Z]+(,-?[a-zA-Z]+)*$/)
    .withMessage(
      'Must a comma-separated string with an optional dash and letters only'
    )
    .optional(),
  ...pagination.queryValidators,
];

const find = async (request: Request, response: Response) => {
  const { auth, query } = request as AuthenticatedRequest;
  const sort = SortApi.parse<OwnerProspectSortableApi>(
    query.sort as string | undefined
  );

  const ownerProspects = await ownerProspectRepository.find({
    establishmentId: auth.establishmentId,
    pagination: createPagination(query as unknown as Required<Pagination>),
    sort,
  });

  const status = isPartial(ownerProspects)
    ? constants.HTTP_STATUS_PARTIAL_CONTENT
    : constants.HTTP_STATUS_OK;
  response.status(status).json(ownerProspects);
};

const updateOwnerProspectValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID'),
  body('callBack').isBoolean().withMessage('Must be a boolean'),
  body('read').isBoolean().withMessage('Must be a boolean'),
];

const update = async (request: Request, response: Response) => {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as OwnerProspectUpdateApi;

  const ownerProspect = await ownerProspectRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!ownerProspect) {
    throw new OwnerProspectMissingError(params.id);
  }

  const updated: OwnerProspectApi = {
    ...ownerProspect,
    callBack: body.callBack,
    read: body.read,
  };
  await ownerProspectRepository.update(updated);

  response.status(constants.HTTP_STATUS_OK).json(updated);
};

export default {
  createOwnerProspectValidators,
  create,
  findOwnerProspectsValidators,
  find,
  updateOwnerProspectValidators,
  update,
};
