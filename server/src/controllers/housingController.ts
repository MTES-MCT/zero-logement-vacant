import { Request, Response } from 'express';
import { body, oneOf, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

import housingRepository from '~/repositories/housingRepository';
import {
  EnergyConsumptionGradesApi,
  hasCampaigns,
  HousingApi,
  HousingRecordApi,
  HousingSortableApi,
  OccupancyKindApi
} from '~/models/HousingApi';
import housingFiltersApi, {
  HousingFiltersApi
} from '~/models/HousingFiltersApi';
import { UserRoles } from '~/models/UserApi';
import eventRepository from '~/repositories/eventRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import sortApi from '~/models/SortApi';
import { HousingPaginatedResultApi } from '~/models/PaginatedResultApi';
import { isArrayOf, isUUID } from '~/utils/validators';
import HousingMissingError from '~/errors/housingMissingError';
import noteRepository from '~/repositories/noteRepository';
import { NoteApi } from '~/models/NoteApi';
import { logger } from '~/infra/logger';
import { HousingFiltersDTO, Pagination } from '@zerologementvacant/models';
import { toHousingRecordApi, toOwnerApi } from '~/scripts/shared';
import HousingExistsError from '~/errors/housingExistsError';
import ownerRepository from '~/repositories/ownerRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import { toHousingOwnersApi } from '~/models/HousingOwnerApi';
import async from 'async';
import HousingUpdateForbiddenError from '~/errors/housingUpdateForbiddenError';
import { HousingEventApi } from '~/models/EventApi';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import fp from 'lodash/fp';

const getValidators = oneOf([
  param('id').isString().isLength({ min: 12, max: 12 }), // localId
  param('id').isUUID() // id
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
    includes: ['events', 'owner', 'perimeters', 'campaigns']
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
}

type ListHousingPayload = Pagination & {
  filters?: HousingFiltersDTO;
};

type HousingQuery = HousingFiltersDTO &
  Partial<Pagination> & { sort?: string[] };

async function list(
  request: Request<
    never,
    HousingPaginatedResultApi,
    ListHousingPayload,
    HousingQuery
  >,
  response: Response<HousingPaginatedResultApi>
) {
  const { auth, user, query } = request as AuthenticatedRequest<
    never,
    HousingPaginatedResultApi,
    ListHousingPayload,
    HousingQuery
  >;

  const pagination: Pagination = {
    paginate: query.paginate,
    page: query.page ?? 1,
    perPage: query.perPage ?? 50
  };
  const role = user.role;
  const sort = sortApi.parse<HousingSortableApi>(query.sort);
  const rawFilters = fp.omit(['paginate', 'page', 'perPage', 'sort'], query);
  const filters: HousingFiltersApi = {
    ...rawFilters,
    multiOwners: rawFilters?.multiOwners?.map((value: boolean) =>
      value ? 'true' : 'false'
    ),
    roomsCounts: rawFilters?.roomsCounts?.map((value: string) =>
      value.toString()
    ),
    isTaxedValues: rawFilters?.isTaxedValues?.map((value: boolean) =>
      value ? 'true' : 'false'
    ),
    energyConsumption:
      rawFilters?.energyConsumption as unknown as EnergyConsumptionGradesApi[],
    occupancies: rawFilters?.occupancies,
    establishmentIds:
      [UserRoles.Admin, UserRoles.Visitor].includes(role) &&
      rawFilters?.establishmentIds?.length
        ? rawFilters?.establishmentIds
        : [auth.establishmentId]
  };

  logger.debug('List housing', {
    pagination,
    filters,
    sort
  });

  const [housing, count] = await Promise.all([
    housingRepository.find({
      filters,
      pagination,
      sort,
      includes: ['owner', 'campaigns']
    }),
    // Kept for backward-compatibility
    // TODO: remove this
    Promise.resolve({ housing: 1, owners: 1 })
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
      totalCount: 0
    });
}

async function count(request: Request, response: Response): Promise<void> {
  logger.trace('Count housing');

  const { auth, query } = request as AuthenticatedRequest;

  const { establishmentId, role } = auth;

  const filters: HousingFiltersApi = {
    ...query,
    multiOwners: query?.multiOwners?.map((value: boolean) =>
      value ? 'true' : 'false'
    ),
    roomsCounts: query?.roomsCounts?.map((value: string) =>
      value.toString()
    ),
    isTaxedValues: query?.isTaxedValues?.map((value: boolean) =>
      value ? 'true' : 'false'
    ),
    energyConsumption:
    query?.energyConsumption as unknown as EnergyConsumptionGradesApi[],
  };

  const count = await housingRepository.count({
    ...filters,
    establishmentIds:
      [UserRoles.Admin, UserRoles.Visitor].includes(role) &&
      filters.establishmentIds?.length
        ? filters.establishmentIds
        : [establishmentId]
  });
  response.status(constants.HTTP_STATUS_OK).json(count);
}

const datafoncierHousingRepository = createDatafoncierHousingRepository();
const datafoncierOwnerRepository = createDatafoncierOwnersRepository();

const createValidators: ValidationChain[] = [
  body('localId').isString().isLength({ min: 12, max: 12 })
];
async function create(request: Request, response: Response) {
  const { auth, body } = request as AuthenticatedRequest;
  const geoCode = body.localId.substring(0, 5);

  const existing = await housingRepository.findOne({
    geoCode,
    localId: body.localId
  });
  if (existing) {
    throw new HousingExistsError(body.localId);
  }

  const datafoncierHousing = await datafoncierHousingRepository.findOne({
    idlocal: body.localId
  });
  if (!datafoncierHousing) {
    throw new HousingMissingError(body.localId);
  }

  const datafoncierOwners =
    await datafoncierOwnerRepository.findDatafoncierOwners({
      filters: {
        idprocpte: datafoncierHousing.idprocpte
      }
    });
  // Create the missing datafoncier owners if needed
  await async.forEach(datafoncierOwners, async (datafoncierOwner) => {
    const owner = toOwnerApi(datafoncierOwner);
    await ownerRepository.betterSave(owner, {
      onConflict: ['idpersonne'],
      merge: false
    });
  });
  const owners = await ownerRepository.find({
    filters: {
      idpersonne: datafoncierOwners.map((owner) => owner.idpersonne)
    }
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
        includes: ['owner']
      })) ?? undefined,
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    conflict: false,
    createdAt: new Date(),
    createdBy: auth.userId
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
      validator.isIn(String(value.status), Object.values(HousingStatusApi))
    ),
  body('housingUpdate.occupancyUpdate')
    .optional()
    .custom((value) =>
      validator.isIn(String(value.occupancy), Object.values(OccupancyKindApi))
    )
    .custom(
      (value) =>
        !value.occupancyIntended ||
        validator.isIn(
          String(value.occupancyIntended),
          Object.values(OccupancyKindApi)
        )
    ),
  body('housingUpdate.note')
    .optional()
    .custom((value) => value.content && !validator.isEmpty(value.content))
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
    update: housingUpdate
  });

  const { establishment, user } = authUser;

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const updatedHousing: HousingApi = {
    ...housing,
    ...(housingUpdate.occupancyUpdate
      ? {
          occupancy: housingUpdate.occupancyUpdate.occupancy,
          occupancyIntended: housingUpdate.occupancyUpdate.occupancyIntended
        }
      : {}),
    ...(housingUpdate.statusUpdate
      ? {
          status: housingUpdate.statusUpdate.status,
          subStatus: housingUpdate.statusUpdate.subStatus,
          vacancyReasons: housingUpdate.statusUpdate.vacancyReasons,
          precisions: housingUpdate.statusUpdate.precisions
        }
      : {})
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
  ...updateValidators
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
      [UserRoles.Admin, UserRoles.Visitor].includes(role) &&
      body.filters.establishmentIds?.length > 0
        ? body.filters.establishmentIds
        : [auth.establishmentId]
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
        ...housingUpdate.statusUpdate
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
      housingGeoCode: housingApi.geoCode
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
        ...housingUpdate.occupancyUpdate
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
      housingGeoCode: housingApi.geoCode
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
      housingGeoCode: geoCode
    });
  }
}

const housingController = {
  getValidators,
  get,
  list,
  count,
  createValidators,
  create,
  updateValidators,
  update,
  updateListValidators,
  updateList
};

export default housingController;
