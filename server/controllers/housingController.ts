import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  hasCampaigns,
  HousingApi,
  HousingRecordApi,
  HousingSortableApi,
  OccupancyKindApi,
} from '../models/HousingApi';
import housingFiltersApi, {
  HousingFiltersApi,
} from '../models/HousingFiltersApi';
import { UserRoles } from '../models/UserApi';
import eventRepository from '../repositories/eventRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { constants } from 'http2';
import { body, oneOf, param, ValidationChain } from 'express-validator';
import validator from 'validator';
import sortApi from '../models/SortApi';
import { HousingPaginatedResultApi } from '../models/PaginatedResultApi';
import { isArrayOf, isUUID } from '../utils/validators';
import paginationApi from '../models/PaginationApi';
import HousingMissingError from '../errors/housingMissingError';
import { v4 as uuidv4 } from 'uuid';
import noteRepository from '../repositories/noteRepository';
import { NoteApi } from '../models/NoteApi';
import _ from 'lodash';
import { logger } from '../utils/logger';
import fp from 'lodash/fp';
import { Pagination } from '../../shared';
import { toHousingRecordApi } from '../../scripts/shared';
import HousingExistsError from '../errors/housingExistsError';
import ownerRepository from '../repositories/ownerRepository';
import housingOwnerRepository from '../repositories/housingOwnerRepository';
import { toHousingOwnersApi } from '../models/HousingOwnerApi';
import async from 'async';
import { processOwner } from '../../scripts/import-datafoncier/ownerImporter';
import HousingUpdateForbiddenError from '../errors/housingUpdateForbiddenError';
import { HousingEventApi } from '../models/EventApi';
import ownerMatchRepository from '../repositories/ownerMatchRepository';
import createDatafoncierHousingRepository from '../repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '../repositories/datafoncierOwnersRepository';
import isIn = validator.isIn;
import isEmpty = validator.isEmpty;

const getValidators = oneOf([
  param('id').isString().isLength({ min: 12, max: 12 }), // localId
  param('id').isUUID(), // id
]);
async function get(request: Request, response: Response) {
  const { params, establishment } = request as AuthenticatedRequest;

  logger.info('Get housing', params.id);

  const id = params.id.length !== 12 ? params.id : undefined;
  const localId = params.id.length === 12 ? params.id : undefined;

  const housing = await housingRepository.findOne({
    geoCode: establishment.geoCodes,
    id,
    localId,
    includes: ['events', 'owner', 'perimeters', 'campaigns'],
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
}

const listValidators: ValidationChain[] = [
  ...housingFiltersApi.validators(),
  ...sortApi.queryValidators,
  ...paginationApi.validators,
];

async function list(
  request: Request,
  response: Response<HousingPaginatedResultApi>
) {
  const { auth, body, user } = request as AuthenticatedRequest;
  // TODO: type the whole body
  const pagination: Pagination = fp.pick(['paginate', 'perPage', 'page'], body);

  const role = user.role;
  const sort = sortApi.parse<HousingSortableApi>(
    request.query.sort as string[] | undefined
  );
  const filters: HousingFiltersApi = {
    ...body.filters,
    establishmentIds:
      role === UserRoles.Admin && body.filters.establishmentIds?.length
        ? body.filters.establishmentIds
        : [auth.establishmentId],
  };

  logger.trace('List housing', {
    pagination,
    filters,
    sort,
  });

  const [housing, count] = await Promise.all([
    housingRepository.find({
      filters,
      pagination,
      sort,
      includes: ['owner', 'campaigns'],
    }),
    // Kept for backward-compatibility
    // TODO: remove this
    Promise.resolve({ housing: 1, owners: 1 }),
  ]);

  const offset = (pagination.page - 1) * pagination.perPage;
  response
    .status(constants.HTTP_STATUS_OK)
    .setHeader(
      'Content-Range',
      `housing ${offset}-${offset + housing.length - 1}/${count.housing}`
    )
    .json({
      entities: housing,
      filteredCount: count.housing,
      filteredOwnerCount: count.owners,
      page: pagination.page,
      perPage: pagination.perPage,
      totalCount: 0,
    });
}

async function count(request: Request, response: Response): Promise<void> {
  logger.trace('Count housing');

  const { establishmentId, role } = (request as AuthenticatedRequest).auth;
  const filters = <HousingFiltersApi>request.body.filters ?? {};

  const count = await housingRepository.count({
    ...filters,
    establishmentIds:
      role === UserRoles.Admin && filters.establishmentIds?.length
        ? filters.establishmentIds
        : [establishmentId],
  });
  response.status(constants.HTTP_STATUS_OK).json(count);
}

const datafoncierHousingRepository = createDatafoncierHousingRepository();
const datafoncierOwnerRepository = createDatafoncierOwnersRepository();

const createValidators: ValidationChain[] = [
  body('localId').isString().isLength({ min: 12, max: 12 }),
];
async function create(request: Request, response: Response) {
  const { auth, body } = request as AuthenticatedRequest;
  const geoCode = body.localId.substring(0, 5);

  const existing = await housingRepository.findOne({
    geoCode,
    localId: body.localId,
  });
  if (existing) {
    throw new HousingExistsError(body.localId);
  }

  const datafoncierHousing = await datafoncierHousingRepository.findOne({
    idlocal: body.localId,
  });
  if (!datafoncierHousing) {
    throw new HousingMissingError(body.localId);
  }

  const datafoncierOwners =
    await datafoncierOwnerRepository.findDatafoncierOwners({
      filters: {
        idprocpte: datafoncierHousing.idprocpte,
      },
    });
  // Create the missing datafoncier owners if needed
  await async.forEach(datafoncierOwners, async (datafoncierOwner) => {
    const { match, owner } = await processOwner(datafoncierOwner);
    if (owner) {
      await ownerRepository.save(owner);
    }
    if (match) {
      await ownerMatchRepository.save(match);
    }
  });
  const owners = await ownerRepository.find({
    filters: {
      idpersonne: datafoncierOwners.map((owner) => owner.idpersonne),
    },
  });

  const housing: HousingRecordApi = toHousingRecordApi(
    { source: 'datafoncier-manual' },
    datafoncierHousing
  );
  await housingRepository.save(housing);
  await housingOwnerRepository.saveMany(toHousingOwnersApi(housing, owners));

  const event: HousingEventApi = {
    id: uuidv4(),
    name: 'Création du logement',
    section: 'Situation',
    category: 'Followup',
    kind: 'Create',
    old: undefined,
    new:
      (await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id,
        includes: ['owner'],
      })) ?? undefined,
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    conflict: false,
    createdAt: new Date(),
    createdBy: auth.userId,
  };
  await eventRepository.insertHousingEvent(event);

  response.status(constants.HTTP_STATUS_CREATED).json(housing);
}

export interface HousingUpdateBody {
  statusUpdate?: Pick<
    HousingApi,
    'status' | 'subStatus' | 'precisions' | 'vacancyReasons'
  >;
  occupancyUpdate?: Pick<HousingApi, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<NoteApi, 'content' | 'noteKind'>;
}

const updateValidators = [
  body('housingUpdate').notEmpty(),
  body('housingUpdate.statusUpdate')
    .optional()
    .custom((value) =>
      isIn(String(value.status), Object.values(HousingStatusApi))
    ),
  body('housingUpdate.occupancyUpdate')
    .optional()
    .custom((value) =>
      isIn(String(value.occupancy), Object.values(OccupancyKindApi))
    )
    .custom(
      (value) =>
        !value.occupancyIntended ||
        isIn(String(value.occupancyIntended), Object.values(OccupancyKindApi))
    ),
  body('housingUpdate.note')
    .optional()
    .custom((value) => value.content && !isEmpty(value.content)),
];

async function update(request: Request, response: Response) {
  const housingId = request.params.housingId;
  const housingUpdateApi = request.body.housingUpdate as HousingUpdateBody;

  const updatedHousing = await updateHousing(
    housingId,
    housingUpdateApi,
    request as AuthenticatedRequest
  );

  response.status(constants.HTTP_STATUS_OK).json(updatedHousing);
}

const updateHousing = async (
  housingId: string,
  housingUpdate: HousingUpdateBody,
  authUser: Pick<AuthenticatedRequest, 'user' | 'establishment'>
): Promise<HousingApi> => {
  logger.trace('Update housing', {
    id: housingId,
    update: housingUpdate,
  });

  const { establishment, user } = authUser;

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes,
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const updatedHousing: HousingApi = {
    ...housing,
    ...(housingUpdate.occupancyUpdate
      ? {
          occupancy: housingUpdate.occupancyUpdate.occupancy,
          occupancyIntended: housingUpdate.occupancyUpdate.occupancyIntended,
        }
      : {}),
    ...(housingUpdate.statusUpdate
      ? {
          status: housingUpdate.statusUpdate.status,
          subStatus: housingUpdate.statusUpdate.subStatus,
          vacancyReasons: housingUpdate.statusUpdate.vacancyReasons,
          precisions: housingUpdate.statusUpdate.precisions,
        }
      : {}),
  };

  await housingRepository.update(updatedHousing);

  await createHousingUpdateEvents(housing, housingUpdate, user.id);

  await createHousingUpdateNote(
    housing.id,
    housingUpdate,
    user.id,
    housing.geoCode
  );

  return updatedHousing;
};

const updateListValidators = [
  body('allHousing').isBoolean(),
  body('housingIds').custom(isArrayOf(isUUID)),
  ...housingFiltersApi.validators(),
  ...updateValidators,
];

async function updateList(request: Request, response: Response) {
  logger.info('Update housing list');

  const { auth, body, user } = request as AuthenticatedRequest;
  const role = user.role;
  const housingUpdateApi = <HousingUpdateBody>body.housingUpdate;
  const allHousing = <boolean>body.allHousing;
  const housingIds = body.housingIds;

  const filters: HousingFiltersApi = {
    ...body.filters,
    establishmentIds:
      role === UserRoles.Admin && body.filters.establishmentIds?.length
        ? body.filters.establishmentIds
        : [auth.establishmentId],
  };

  const housingList = await housingRepository
    .find({ filters, pagination: { paginate: false }, includes: ['campaigns'] })
    .then((_) =>
      _.filter((housing) =>
        allHousing
          ? !housingIds.includes(housing.id)
          : housingIds.includes(housing.id)
      )
    );

  const housingContactedWithCampaigns = housingList.filter(
    (housing) =>
      housing.status !== HousingStatusApi.NeverContacted &&
      hasCampaigns(housing)
  );
  if (
    housingUpdateApi.statusUpdate?.status === HousingStatusApi.NeverContacted &&
    housingContactedWithCampaigns.length > 0
  ) {
    throw new HousingUpdateForbiddenError(
      ...housingContactedWithCampaigns.map((housing) => housing.id)
    );
  }

  const updatedHousingList = await Promise.all(
    housingList.map((housing) =>
      updateHousing(
        housing.id,
        housingUpdateApi,
        request as AuthenticatedRequest
      )
    )
  );

  response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
}

async function createHousingUpdateEvents(
  housingApi: HousingApi,
  housingUpdate: HousingUpdateBody,
  userId: string
): Promise<void> {
  const statusUpdate = housingUpdate.statusUpdate;
  if (
    statusUpdate &&
    (housingApi.status !== statusUpdate.status ||
      housingApi.subStatus !== statusUpdate.subStatus ||
      !_.isEqual(housingApi.precisions, statusUpdate.precisions) ||
      !_.isEqual(housingApi.vacancyReasons, statusUpdate.vacancyReasons))
  ) {
    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: 'Changement de statut de suivi',
      kind: 'Update',
      category: 'Followup',
      section: 'Situation',
      old: housingApi,
      new: {
        ...housingApi,
        ...housingUpdate.statusUpdate,
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
      housingGeoCode: housingApi.geoCode,
    });
  }

  const occupancyUpdate = housingUpdate.occupancyUpdate;
  if (
    occupancyUpdate &&
    ((housingApi.occupancy ?? '') !== (occupancyUpdate.occupancy ?? '') ||
      (housingApi.occupancyIntended ?? '') !==
        (occupancyUpdate.occupancyIntended ?? ''))
  ) {
    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: "Modification du statut d'occupation",
      kind: 'Update',
      category: 'Followup',
      section: 'Situation',
      old: housingApi,
      new: {
        ...housingApi,
        ...housingUpdate.occupancyUpdate,
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
      housingGeoCode: housingApi.geoCode,
    });
  }
}
async function createHousingUpdateNote(
  housingId: string,
  housingUpdate: HousingUpdateBody,
  userId: string,
  geoCode: string
) {
  if (housingUpdate.note) {
    await noteRepository.insertHousingNote({
      id: uuidv4(),
      ...housingUpdate.note,
      createdBy: userId,
      createdAt: new Date(),
      housingId,
      housingGeoCode: geoCode,
    });
  }
}

const housingController = {
  getValidators,
  get,
  listValidators,
  list,
  count,
  createValidators,
  create,
  updateValidators,
  update,
  updateListValidators,
  updateList,
};

export default housingController;
