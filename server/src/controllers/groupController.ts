import { GroupDTO, GroupPayloadDTO } from '@zerologementvacant/models';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import GroupMissingError from '~/errors/groupMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { GroupHousingEventApi } from '~/models/EventApi';
import { GroupApi, toGroupDTO } from '~/models/GroupApi';
import housingFiltersApi from '~/models/HousingFiltersApi';
import campaignRepository from '~/repositories/campaignRepository';
import eventRepository from '~/repositories/eventRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import { isArrayOf, isString, isUUIDParam } from '~/utils/validators';

const list = async (request: Request, response: Response): Promise<void> => {
  const { auth } = request as AuthenticatedRequest;
  const { establishmentId, userId } = auth;

  logger.info('Find groups', {
    user: userId,
    establishment: establishmentId
  });

  const groups = await groupRepository.find({
    filters: {
      establishmentId
    }
  });
  response.status(constants.HTTP_STATUS_OK).json(groups.map(toGroupDTO));
};

const create: RequestHandler<never, GroupDTO, GroupPayloadDTO> = async (
  request,
  response
): Promise<void> => {
  const { body, establishment, user } = request as AuthenticatedRequest<
    never,
    GroupDTO,
    GroupPayloadDTO
  >;

  // Keep the housing list that are in the same establishment as the group
  const housings =
    body.housing.all !== undefined
      ? await housingRepository
          .find({
            filters: {
              ...body.housing.filters,
              establishmentIds: [establishment.id]
            },
            includes: ['owner'],
            pagination: { paginate: false }
          })
          .then((housingList) => {
            const ids = new Set(body.housing.ids);
            return housingList.filter((housing) =>
              body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
            );
          })
      : [];
  const owners = housings.map((housing) => housing.owner);

  const group: GroupApi = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    housingCount: housings.length,
    ownerCount: fp.uniqBy('id', owners).length,
    createdAt: new Date(),
    createdBy: user,
    userId: user.id,
    establishmentId: establishment.id,
    exportedAt: null,
    archivedAt: null
  };
  const events = housings.map<GroupHousingEventApi>((housing) => ({
    id: uuidv4(),
    name: 'Ajout dans un groupe',
    type: 'housing:group-attached',
    conflict: false,
    nextOld: null,
    nextNew: {
      name: group.title
    },
    createdAt: new Date().toJSON(),
    createdBy: user.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    groupId: group.id
  }));

  await startTransaction(async () => {
    await groupRepository.save(group, housings);
    await eventRepository.insertManyGroupHousingEvents(events);
  });
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
  ...housingFiltersApi.validators('housing.filters')
];

const show = async (request: Request, response: Response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
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
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(params.id);
  }

  const housingList = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      groupIds: [group.id]
    },
    pagination: {
      paginate: false
    }
  });
  const updatedGroup: GroupApi = {
    ...group,
    title: body.title,
    description: body.description
  };
  await groupRepository.save(updatedGroup, housingList);

  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(updatedGroup));
};
const updateValidators: ValidationChain[] = [
  ...createValidators,
  isUUIDParam('id')
];

const addHousing = async (
  request: Request,
  response: Response
): Promise<void> => {
  const { auth, body, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(params.id);
  }

  // Keep the housing list that are in the same establishment as the group
  const [addingHousingList, existingHousingList] = await Promise.all([
    housingRepository
      .find({
        filters: {
          ...body.filters,
          establishmentIds: [auth.establishmentId]
        },
        includes: ['owner'],
        pagination: { paginate: false }
      })
      .then((housingList) => {
        const ids = new Set(body.ids);
        return housingList.filter((housing) =>
          body.all ? !ids.has(housing.id) : ids.has(housing.id)
        );
      }),
    housingRepository.find({
      filters: {
        groupIds: [group.id],
        establishmentIds: [auth.establishmentId]
      },
      includes: ['owner'],
      pagination: { paginate: false }
    })
  ]);

  const diff = fp.differenceBy('id', addingHousingList, existingHousingList);
  const uniqueHousingList = fp.uniqBy(
    'id',
    addingHousingList.concat(existingHousingList)
  );
  const uniqueOwners = fp.uniqBy(
    'id',
    uniqueHousingList.map((housing) => housing.owner)
  );

  const events = diff.map<GroupHousingEventApi>((housing) => ({
    id: uuidv4(),
    name: 'Ajout dans un groupe',
    type: 'housing:group-attached',
    conflict: false,
    nextOld: null,
    nextNew: {
      name: group.title
    },
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    groupId: group.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  }));
  await Promise.all([
    groupRepository.addHousing(group, diff),
    eventRepository.insertManyGroupHousingEvents(events)
  ]);

  const updatedGroup: GroupApi = {
    ...group,
    housingCount: uniqueHousingList.length,
    ownerCount: uniqueOwners.length
  };
  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(updatedGroup));
};
const addHousingValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('all').isBoolean().notEmpty(),
  body('ids').custom(isArrayOf(isString)),
  ...housingFiltersApi.validators('filters')
];

const removeHousing = async (request: Request, response: Response) => {
  const { auth, body, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(params.id);
  }

  // Keep the housing list that are in the same establishment as the group
  const [removingHousingList, existingHousingList] = await Promise.all([
    housingRepository
      .find({
        filters: {
          ...body.filters,
          establishmentIds: [auth.establishmentId]
        },
        includes: ['owner'],
        pagination: { paginate: false }
      })
      .then((housingList) => {
        const ids = new Set(body.ids);
        return housingList.filter((housing) =>
          body.all ? !ids.has(housing.id) : ids.has(housing.id)
        );
      }),
    housingRepository.find({
      filters: {
        groupIds: [group.id],
        establishmentIds: [auth.establishmentId]
      },
      includes: ['owner'],
      pagination: { paginate: false }
    })
  ]);

  const housingList = fp.differenceBy(
    'id',
    existingHousingList,
    removingHousingList
  );
  const owners = housingList.map((housing) => housing.owner);

  const events = removingHousingList.map<GroupHousingEventApi>((housing) => ({
    id: uuidv4(),
    name: 'Retrait d’un groupe',
    type: 'housing:group-detached',
    conflict: false,
    nextOld: {
      name: group.title
    },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    groupId: group.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  }));
  await startTransaction(async () => {
    await Promise.all([
      groupRepository.removeHousing(group, removingHousingList),
      eventRepository.insertManyGroupHousingEvents(events)
    ]);
  });

  const updatedGroup: GroupApi = {
    ...group,
    housingCount: housingList.length,
    ownerCount: fp.uniqBy('id', owners).length
  };
  response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(updatedGroup));
};
const removeHousingValidators: ValidationChain[] = addHousingValidators;

const remove = async (request: Request, response: Response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest;

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!group) {
    throw new GroupMissingError(params.id);
  }

  const [campaigns, housingList] = await Promise.all([
    campaignRepository.find({
      filters: {
        establishmentId: auth.establishmentId,
        groupIds: [group.id]
      }
    }),
    housingRepository.find({
      filters: {
        establishmentIds: [auth.establishmentId],
        groupIds: [group.id]
      },
      pagination: { paginate: false }
    })
  ]);

  if (campaigns.length > 0) {
    const events = housingList.map<GroupHousingEventApi>((housing) => ({
      id: uuidv4(),
      name: 'Archivage d’un groupe',
      type: 'housing:group-archived',
      conflict: false,
      nextOld: {
        name: group.title
      },
      nextNew: null,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      groupId: group.id
    }));

    const archived = await startTransaction(async () => {
      const [archived] = await Promise.all([
        groupRepository.archive(group),
        eventRepository.insertManyGroupHousingEvents(events)
      ]);
      return archived;
    });
    response.status(constants.HTTP_STATUS_OK).json(toGroupDTO(archived));
    return;
  }

  const events = housingList.map<GroupHousingEventApi>((housing) => ({
    id: uuidv4(),
    name: 'Suppression d’un groupe',
    type: 'housing:group-removed',
    conflict: false,
    nextOld: {
      name: group.title
    },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    groupId: null
  }));
  await startTransaction(async () => {
    await Promise.all([
      groupRepository.remove(group),
      eventRepository.insertManyGroupHousingEvents(events)
    ]);
  });
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
  addHousingValidators,
  removeHousing,
  removeHousingValidators,
  remove,
  removeValidators
};

export default groupController;
