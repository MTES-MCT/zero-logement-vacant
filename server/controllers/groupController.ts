import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import groupRepository from '../repositories/groupRepository';
import GroupMissingError from '../errors/groupMissingError';
import { logger } from '../utils/logger';
import { GroupApi, toGroupDTO } from '../models/GroupApi';
import housingRepository from '../repositories/housingRepository';
import { isArrayOf, isString } from '../utils/validators';

const list = async (request: Request, response: Response): Promise<void> => {
  const { auth } = request as AuthenticatedRequest;
  const { establishmentId, userId } = auth;

  logger.info('Find groups', {
    user: userId,
    establishment: establishmentId,
  });

  const groups = await groupRepository.find({
    filters: {
      establishmentId,
    },
  });
  response.status(constants.HTTP_STATUS_OK).json(groups.map(toGroupDTO));
};

const create = async (request: Request, response: Response): Promise<void> => {
  const { body, establishment, user } = request as AuthenticatedRequest;

  // Keep the housing list that are in the same establishment as the group
  const housingList = await housingRepository
    .find({
      filters: {
        ...body.housing.filters,
        establishmentIds: [establishment.id],
      },
      pagination: { paginate: false },
    })
    .then((housingList) => {
      const ids = new Set(body.housing.ids);
      return housingList.filter((housing) =>
        body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
      );
    });
  const owners = housingList.map((housing) => housing.owner);

  const group: GroupApi = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    housingCount: housingList.length,
    ownerCount: fp.uniqBy('id', owners).length,
    createdAt: new Date(),
    createdBy: user,
    userId: user.id,
    establishmentId: establishment.id,
  };
  await groupRepository.save(group, housingList);

  response.status(constants.HTTP_STATUS_CREATED).json(toGroupDTO(group));
};
const createValidators: ValidationChain[] = [
  body('title').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('housing').isObject({ strict: true }).optional(),
  body('housing.all').if(body('housing').notEmpty()).isBoolean().notEmpty(),
  body('housing.ids')
    .if(body('housing').notEmpty())
    .custom(isArrayOf(isString)),
  // FIXME
  // ...housingFiltersApi.validators('housing.filters'),
];

const show = async (request: Request, response: Response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!group) {
    throw new GroupMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(group));
};
const showValidators: ValidationChain[] = [param('id').isString().notEmpty()];

const update = async (request: Request, response: Response): Promise<void> => {
  const { auth, body, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!group) {
    throw new GroupMissingError(params.id);
  }

  // Keep the housing list that are in the same establishment as the group
  const housingList = await housingRepository
    .find({
      filters: {
        ...body.housing.filters,
        establishmentIds: [auth.establishmentId],
      },
      pagination: { paginate: false },
    })
    .then((housingList) => {
      const ids = new Set(body.housing.ids);
      return housingList.filter((housing) =>
        body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
      );
    });
  const owners = housingList.map((housing) => housing.owner);

  const updatedGroup: GroupApi = {
    ...group,
    title: body.title,
    description: body.description,
    housingCount: housingList.length,
    ownerCount: fp.uniqBy('id', owners).length,
  };
  await groupRepository.save(updatedGroup, housingList);

  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(updatedGroup));
};
const updateValidators: ValidationChain[] = [
  ...createValidators,
  param('id').isString().notEmpty(),
];

const addHousing = async (
  request: Request,
  response: Response
): Promise<void> => {
  const { auth, body, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!group) {
    throw new GroupMissingError(params.id);
  }

  // Keep the housing list that are in the same establishment as the group
  const [addingHousingList, existingHousingList] = await Promise.all([
    housingRepository.find({
      filters: {
        ...body.housing.filters,
        establishmentIds: [auth.establishmentId],
      },
      pagination: { paginate: false },
    }),
    housingRepository.find({
      filters: {
        groupIds: [group.id],
        establishmentIds: [auth.establishmentId],
      },
      pagination: { paginate: false },
    }),
  ]);

  const ids = new Set(body.housing.ids);
  const housingList = fp.uniqBy(
    'id',
    addingHousingList
      .filter((housing) =>
        body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
      )
      .concat(existingHousingList)
  );
  const owners = housingList.map((housing) => housing.owner);

  const updatedGroup: GroupApi = {
    ...group,
    title: body.title,
    description: body.description,
    housingCount: housingList.length,
    ownerCount: fp.uniqBy('id', owners).length,
  };
  await groupRepository.save(updatedGroup, housingList);

  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(updatedGroup));
};

const remove = async (request: Request, response: Response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!group) {
    throw new GroupMissingError(params.id);
  }

  await groupRepository.remove(group);
  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};
const removeValidators: ValidationChain[] = [param('id').isString().notEmpty()];

const groupController = {
  list,
  show,
  showValidators,
  create,
  createValidators,
  update,
  updateValidators,
  addHousing,
  remove,
  removeValidators,
};

export default groupController;
