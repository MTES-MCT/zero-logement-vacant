import { body, param, query, ValidationChain } from 'express-validator';
import { Request, Response } from 'express';
import { constants } from 'http2';
import { AuthenticatedRequest } from 'express-jwt';
import {
  OwnerProspectApi,
  OwnerProspectSortableApi,
  OwnerProspectUpdateApi,
} from '../models/OwnerProspectApi';
import ownerProspectRepository from '../repositories/ownerProspectRepository';
import pagination, { createPagination } from '../models/PaginationApi';
import { isPartial } from '../models/PaginatedResultApi';
import SortApi from '../models/SortApi';
import OwnerProspectMissingError from '../errors/ownerProspectMissingError';

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

const createOwnerProspect = async (request: Request, response: Response) => {
  const ownerProspectApi = request.body as OwnerProspectApi;

  const createdOwnerProspect = await ownerProspectRepository.insert({
    ...ownerProspectApi,
    callBack: true,
    read: false,
  });

  response.status(constants.HTTP_STATUS_CREATED).json(createdOwnerProspect);
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
    pagination: createPagination(query),
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
  createOwnerProspect,
  findOwnerProspectsValidators,
  find,
  updateOwnerProspectValidators,
  update,
};
