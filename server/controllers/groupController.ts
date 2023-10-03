import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import groupRepository from '../repositories/groupRepository';
import { body, param, ValidationChain } from 'express-validator';
import GroupMissingError from '../errors/groupMissingError';
import { logger } from '../utils/logger';
import { GroupApi, toGroupDTO } from '../models/GroupApi';
import housingRepository from '../repositories/housingRepository';
import fp from 'lodash/fp';
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
  const housingList = await housingRepository.find({
    filters: {
      housingIds: body.housingIds,
      establishmentIds: [establishment.id],
    },
    pagination: { paginate: false },
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
  body('housingIds').isArray({ min: 1 }).custom(isArrayOf(isString)),
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
  const housingList = await housingRepository.find({
    filters: {
      housingIds: body.housingIds,
      establishmentIds: [auth.establishmentId],
    },
    pagination: { paginate: false },
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
  remove,
  removeValidators,
};

export default groupController;
