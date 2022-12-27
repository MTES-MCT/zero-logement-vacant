import { NextFunction, Request, Response } from 'express';
import addressService from '../services/addressService';
import housingRepository from '../repositories/housingRepository';
import {
  HousingApi,
  HousingSortableApi,
  HousingUpdateApi,
} from '../models/HousingApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS from 'exceljs';
import { AddressApi, AddressKinds } from '../models/AddressApi';
import { RequestUser, UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { Request as JWTRequest } from 'express-jwt';
import {
  getHousingStatusApiLabel,
  HousingStatusApi,
} from '../models/HousingStatusApi';
import exportFileService from '../services/exportFileService';
import { constants } from 'http2';
import { body, param, validationResult } from 'express-validator';
import validator from 'validator';
import banAddressesRepository from '../repositories/banAddressesRepository';
import SortApi from '../models/SortApi';

const get = async (request: Request, response: Response): Promise<Response> => {
  const id = request.params.id;

  console.log('Get housing', id);

  return housingRepository
    .get(id)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const list = async (
  request: JWTRequest,
  response: Response,
  next: NextFunction
) => {
  console.log('List housing');

  const page = request.body.page;
  const perPage = request.body.perPage;
  const role = (<RequestUser>request.auth).role;
  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const filters = <HousingFiltersApi>request.body.filters ?? {};
  const sort = SortApi.parse<HousingSortableApi>(
    request.query.sort as string | undefined
  );

  try {
    const housing = await housingRepository.listWithFilters(
      {
        ...filters,
        establishmentIds:
          role === UserRoles.Admin && filters.establishmentIds?.length
            ? filters.establishmentIds
            : [establishmentId],
      },
      page,
      perPage,
      sort
    );
    return response.status(constants.HTTP_STATUS_OK).json(housing);
  } catch (err) {
    next(err);
  }
};

const listByOwner = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;
  const establishmentId = (<RequestUser>request.auth).establishmentId;

  console.log('List housing by owner', ownerId);

  return Promise.all([
    housingRepository.listWithFilters({
      establishmentIds: [establishmentId],
      ownerIds: [ownerId],
    }),
    housingRepository.countWithFilters({ ownerIds: [ownerId] }),
  ]).then(([list, totalCount]) =>
    response
      .status(constants.HTTP_STATUS_OK)
      .json({ entities: list.entities, totalCount })
  );
};

const updateHousingValidators = [
  param('housingId').isUUID(),
  body('housingUpdate').notEmpty(),
  body('housingUpdate.status').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate.contactKind').notEmpty(),
];

const updateHousing = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const housingId = request.params.housingId;

  console.log('Update housing', housingId);

  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const userId = (<RequestUser>request.auth).userId;
  const housingUpdateApi = <HousingUpdateApi>request.body.housingUpdate;

  const housing = await housingRepository.get(housingId);

  const campaignList = await campaignRepository.listCampaigns(establishmentId);

  const lastCampaignId = housing.campaignIds.length
    ? campaignList
        .filter((_) => housing.campaignIds.indexOf(_.id) !== -1)
        .reverse()[0].id
    : campaignList.filter((_) => _.campaignNumber === 0)[0].id;

  if (!housing.campaignIds.length) {
    await campaignHousingRepository.insertHousingList(lastCampaignId, [
      housing.id,
    ]);
  }

  await createHousingUpdateEvent(
    [housing],
    housingUpdateApi,
    [lastCampaignId],
    userId
  );

  if (housingUpdateApi.status === HousingStatusApi.NeverContacted) {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      [lastCampaignId],
      [housing.id]
    );
  }

  const updatedHousingList = await housingRepository.updateHousingList(
    [housing.id],
    housingUpdateApi.status,
    housingUpdateApi.subStatus,
    housingUpdateApi.precisions,
    housingUpdateApi.vacancyReasons
  );

  return response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
};

const updateHousingListValidators = [
  body('housingIds')
    .isArray()
    .custom((value) => value.every((v: any) => validator.isUUID(v))),
  body('campaignIds')
    .notEmpty()
    .isArray()
    .custom((value) => value.every((v: any) => validator.isUUID(v))),
  body('currentStatus').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate').notEmpty(),
  body('housingUpdate.status').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate.contactKind').notEmpty(),
];

const updateHousingList = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  console.log('Update campaign housing list');

  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const userId = (<RequestUser>request.auth).userId;
  const housingUpdateApi = <HousingUpdateApi>request.body.housingUpdate;
  const reqCampaignIds = request.body.campaignIds;
  const allHousing = <boolean>request.body.allHousing;
  const housingIds = request.body.housingIds;
  const currentStatus = request.body.currentStatus;
  const query = request.body.query;

  const campaignIds = await campaignRepository
    .listCampaigns(establishmentId)
    .then((_) =>
      _.map((_) => _.id).filter((_) => reqCampaignIds.indexOf(_) !== -1)
    );

  const housingList = await housingRepository
    .listWithFilters({
      establishmentIds: [establishmentId],
      campaignIds,
      status: [currentStatus],
      query,
    })
    .then((_) =>
      _.entities.filter((housing) =>
        allHousing
          ? housingIds.indexOf(housing.id) === -1
          : housingIds.indexOf(housing.id) !== -1
      )
    );

  await createHousingUpdateEvent(
    housingList,
    housingUpdateApi,
    campaignIds,
    userId
  );

  if (housingUpdateApi.status === HousingStatusApi.NeverContacted) {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      campaignIds,
      housingList.map((_) => _.id)
    );
  }

  const updatedHousingList = await housingRepository.updateHousingList(
    housingList.map((_) => _.id),
    housingUpdateApi.status,
    housingUpdateApi.subStatus,
    housingUpdateApi.precisions,
    housingUpdateApi.vacancyReasons
  );

  return response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
};

const createHousingUpdateEvent = async (
  housingList: HousingApi[],
  housingUpdateApi: HousingUpdateApi,
  campaignIds: string[],
  userId: string
) => {
  return eventRepository.insertList(
    housingList.map(
      (housing) =>
        <EventApi>{
          housingId: housing.id,
          ownerId: housing.owner.id,
          kind: EventKinds.StatusChange,
          campaignId: campaignIds
            .filter((_) => housing.campaignIds.indexOf(_) !== -1)
            .reverse()[0],
          contactKind: housingUpdateApi.contactKind,
          content: [
            getStatusLabel(housing, housingUpdateApi),
            housingUpdateApi.comment,
          ]
            .filter((_) => _ !== null && _ !== undefined)
            .join('. '),
          createdBy: userId,
        }
    )
  );
};

const getStatusLabel = (
  housingApi: HousingApi,
  housingUpdateApi: HousingUpdateApi
) => {
  return housingApi.status !== housingUpdateApi.status ||
    housingApi.subStatus != housingUpdateApi.subStatus ||
    housingApi.precisions != housingUpdateApi.precisions
    ? [
        'Passage à ' + getHousingStatusApiLabel(housingUpdateApi.status),
        housingUpdateApi.subStatus,
        housingUpdateApi.precisions?.join(', '),
      ]
        .filter((_) => _?.length)
        .join(' - ')
    : undefined;
};

const exportHousingByCampaignBundle = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const campaignNumber = request.params.campaignNumber;
  const reminderNumber = request.params.reminderNumber;
  const establishmentId = (<RequestUser>request.auth).establishmentId;

  console.log(
    'Export housing by campaign bundle',
    establishmentId,
    campaignNumber,
    reminderNumber
  );

  const campaignApi = await campaignRepository.getCampaignBundle(
    establishmentId,
    campaignNumber,
    reminderNumber
  );

  if (!campaignApi) {
    return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
  }

  const housingList = await housingRepository
    .listWithFilters({
      establishmentIds: [establishmentId],
      campaignIds: campaignApi.campaignIds,
    })
    .then((_) => _.entities);

  const fileName = `C${campaignApi.campaignNumber}.xlsx`;

  return await exportHousingList(housingList, fileName, response);
};

const exportHousingList = async (
  housingList: HousingApi[],
  fileName: string,
  response: Response
): Promise<Response> => {
  const housingAddresses = await banAddressesRepository.listByRefIds(
    housingList.map((_) => _.id),
    AddressKinds.Housing
  );
  const ownerAddresses = await banAddressesRepository.listByRefIds(
    housingList.map((_) => _.owner.id),
    AddressKinds.Owner
  );

  const workbook = new ExcelJS.Workbook();
  const ownerWorksheet = workbook.addWorksheet('Propriétaires');
  const housingWorksheet = workbook.addWorksheet('Logements');

  housingWorksheet.columns = [
    { header: 'Invariant', key: 'invariant' },
    { header: 'Référence cadastrale', key: 'cadastralReference' },
    { header: 'Propriétaire', key: 'owner' },
    { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
    {
      header: 'Adresse BAN du propriétaire - Numéro',
      key: 'ownerAddressHouseNumber',
    },
    { header: 'Adresse BAN du propriétaire - Rue', key: 'ownerAddressStreet' },
    {
      header: 'Adresse BAN du propriétaire - Code postal',
      key: 'ownerAddressPostalCode',
    },
    { header: 'Adresse BAN du propriétaire - Ville', key: 'ownerAddressCity' },
    {
      header: 'Adresse BAN du propriétaire - Fiabilité',
      key: 'ownerAddressScore',
    },
    { header: 'Adresse LOVAC du logement', key: 'housingRawAddress' },
    { header: 'Adresse BAN du logement', key: 'housingAddress' },
  ];

  housingList.map((housing: HousingApi) => {
    const housingAddress = housingAddresses.find((_) => _.refId === housing.id);
    const ownerAddress = ownerAddresses.find(
      (_) => _.refId === housing.owner.id
    );
    housingWorksheet.addRow({
      invariant: housing.invariant,
      cadastralReference: housing.cadastralReference,
      owner: housing.owner.fullName,
      ownerRawAddress: reduceRawAddress(housing.owner.rawAddress),
      ownerAddressHouseNumber: ownerAddress?.houseNumber,
      ownerAddressStreet: ownerAddress?.street,
      ownerAddressPostalCode: ownerAddress?.postalCode,
      ownerAddressCity: ownerAddress?.city,
      ownerAddressScore: ownerAddress?.score,
      housingRawAddress: reduceRawAddress(housing.rawAddress),
      housingAddress: reduceAddressApi(housingAddress),
    });
  });

  const housingListByOwner = housingList.reduce(
    (
      ownersHousing: { owner: OwnerApi; housingList: HousingApi[] }[],
      housing
    ) => [
      ...ownersHousing.filter((_) => _.owner.id !== housing.owner.id),
      {
        owner: housing.owner,
        housingList: [
          ...(ownersHousing.find((_) => _.owner.id === housing.owner.id)
            ?.housingList ?? []),
          housing,
        ],
      },
    ],
    []
  );

  const maxHousingCount = Math.max(
    ...housingListByOwner.map((_) => _.housingList.length)
  );

  ownerWorksheet.columns = [
    { header: 'Propriétaire', key: 'owner' },
    { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
    {
      header: 'Adresse BAN du propriétaire - Numéro',
      key: 'ownerAddressHouseNumber',
    },
    { header: 'Adresse BAN du propriétaire - Rue', key: 'ownerAddressStreet' },
    {
      header: 'Adresse BAN du propriétaire - Code postal',
      key: 'ownerAddressPostalCode',
    },
    { header: 'Adresse BAN du propriétaire - Ville', key: 'ownerAddressCity' },
    {
      header: 'Adresse BAN du propriétaire - Fiabilité',
      key: 'ownerAddressScore',
    },
    ...[...Array(maxHousingCount).keys()]
      .map((index) => [
        {
          header: `Adresse LOVAC du logement ${index + 1}`,
          key: `housingRawAddress_${index}`,
        },
        {
          header: `Adresse BAN du logement ${index + 1}`,
          key: `housingAddress_${index}`,
        },
      ])
      .flat(),
  ];

  housingListByOwner.forEach(
    (ownerHousing: { owner: OwnerApi; housingList: HousingApi[] }) => {
      const ownerAddress = ownerAddresses.find(
        (_) => _.refId === ownerHousing.owner.id
      );
      const row: any = {
        owner: ownerHousing.owner.fullName,
        ownerRawAddress: reduceRawAddress(ownerHousing.owner.rawAddress),
        ownerAddressHouseNumber: ownerAddress?.houseNumber,
        ownerAddressStreet: ownerAddress?.street,
        ownerAddressPostalCode: ownerAddress?.postalCode,
        ownerAddressCity: ownerAddress?.city,
        ownerAddressScore: ownerAddress?.score,
      };

      ownerHousing.housingList.forEach((housing, index) => {
        row[`housingRawAddress_${index}`] = reduceRawAddress(
          ownerHousing.housingList[index]?.rawAddress
        );
        row[`housingAddress_${index}`] = reduceAddressApi(
          housingAddresses.find((_) => _.refId === housing.id)
        );
      });

      ownerWorksheet.addRow(row);
    }
  );

  return exportFileService.sendWorkbook(workbook, fileName, response);
};

const normalizeAddresses = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const establishmentId = request.params.establishmentId;

  console.log('Normalize address for establishment', establishmentId);

  return addressService
    .normalizeEstablishmentAddresses(establishmentId)
    .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const reduceAddressApi = (addressApi?: AddressApi) => {
  return addressApi
    ? [
        addressApi.houseNumber,
        addressApi.street,
        addressApi.postalCode,
        addressApi.city,
      ]
        .filter((_) => _)
        .join(' ')
    : addressApi;
};

const reduceRawAddress = (rawAddress?: string[]) => {
  return rawAddress
    ? rawAddress.filter((_) => _).join(String.fromCharCode(10))
    : rawAddress;
};

const housingController = {
  get,
  list,
  listByOwner,
  updateHousingValidators,
  updateHousing,
  updateHousingListValidators,
  updateHousingList,
  exportHousingByCampaignBundle,
  normalizeAddresses,
};

export default housingController;
