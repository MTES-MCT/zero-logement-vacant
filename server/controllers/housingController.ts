import { NextFunction, Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  HousingApi,
  HousingSortableApi,
  HousingUpdateApi,
} from '../models/HousingApi';
import {
  HousingFiltersApi,
  HousingFiltersForTotalCountApi,
} from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS, { Workbook } from 'exceljs';
import {
  AddressApi,
  AddressKinds,
  formatAddressApi,
} from '../models/AddressApi';
import { UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { AuthenticatedRequest } from 'express-jwt';
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
import mailService from '../services/mailService';
import establishmentRepository from '../repositories/establishmentRepository';
import { CampaignApi } from '../models/CampaignApi';
import { reduceStringArray } from '../utils/stringUtils';

const get = async (request: Request, response: Response): Promise<Response> => {
  const id = request.params.id;

  console.log('Get housing', id);

  return housingRepository
    .get(id)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const list = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log('List housing');

  const { auth, user } = request as AuthenticatedRequest;
  const { page, perPage } = request.body;

  const role = user.role;
  const establishmentId = auth.establishmentId;
  const filters = <HousingFiltersApi>request.body.filters ?? {};
  const filtersForTotalCount =
    <HousingFiltersForTotalCountApi>request.body.filtersForTotalCount ?? {};
  const sort = SortApi.parse<HousingSortableApi>(
    request.query.sort as string | undefined
  );

  const establishmentIds =
    role === UserRoles.Admin && filters.establishmentIds?.length
      ? filters.establishmentIds
      : [establishmentId];

  try {
    const housing = await housingRepository.paginatedListWithFilters(
      {
        ...filters,
        establishmentIds,
      },
      {
        ...filtersForTotalCount,
        establishmentIds,
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

const count = async (request: Request, response: Response) => {
  console.log('Count housing');

  const { establishmentId, role } = (request as AuthenticatedRequest).auth;
  const filters = <HousingFiltersApi>request.body.filters ?? {};

  return housingRepository
    .countWithFilters({
      ...filters,
      establishmentIds:
        role === UserRoles.Admin && filters.establishmentIds?.length
          ? filters.establishmentIds
          : [establishmentId],
    })
    .then((count) => response.status(constants.HTTP_STATUS_OK).json({ count }));
};

const listByOwner = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

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
      .json({ entities: list, totalCount })
  );
};

const updateHousingValidators = [
  param('housingId').isUUID(),
  body('housingUpdate').notEmpty(),
  body('housingUpdate.status').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate.contactKind').notEmpty(),
];

const updateHousing = async (
  request: Request,
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

  const { userId, establishmentId } = (request as AuthenticatedRequest).auth;
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
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  console.log('Update campaign housing list');

  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
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
      _.filter((housing) =>
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
  request: Request,
  response: Response
) => {
  const campaignNumber = request.params.campaignNumber;
  const reminderNumber = request.params.reminderNumber;
  const { auth, user } = request as AuthenticatedRequest;
  const { establishmentId } = auth;

  console.log(
    'Export housing by campaign bundle',
    establishmentId,
    campaignNumber,
    reminderNumber
  );

  const [campaignApi, campaignList, establishment] = await Promise.all([
    campaignRepository.getCampaignBundle(
      establishmentId,
      campaignNumber,
      reminderNumber
    ),
    campaignRepository.listCampaigns(establishmentId),
    establishmentRepository.get(establishmentId),
  ]);

  if (!campaignApi || !establishment) {
    return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
  }

  const housingList = await housingRepository.listWithFilters({
    establishmentIds: [establishmentId],
    campaignIds: campaignApi.campaignIds,
  });

  const fileName = campaignNumber
    ? `C${campaignApi.campaignNumber}.xlsx`
    : 'LogementSuivis.xlsx';

  await exportHousingList(
    housingList,
    fileName,
    campaignNumber ? ['owner', 'housing:light'] : ['housing:complete'],
    campaignList,
    response
  );
  mailService.emit('housing:exported', user.email, {
    priority: establishment.priority,
  });
};

const exportHousingList = async (
  housingList: HousingApi[],
  fileName: string,
  worksheets: ('owner' | 'housing:light' | 'housing:complete')[],
  campaignList: CampaignApi[],
  response: Response
) => {
  const housingAddresses = await banAddressesRepository.listByRefIds(
    housingList.map((_) => _.id),
    AddressKinds.Housing
  );
  const ownerAddresses = await banAddressesRepository.listByRefIds(
    housingList.map((_) => _.owner.id),
    AddressKinds.Owner
  );

  const workbook = new ExcelJS.Workbook();

  if (worksheets.includes('owner')) {
    addOwnerWorksheet(workbook, housingList, housingAddresses, ownerAddresses);
  }
  if (worksheets.includes('housing:light')) {
    addHousingLightWorksheet(
      workbook,
      housingList,
      housingAddresses,
      ownerAddresses
    );
  }
  if (worksheets.includes('housing:complete')) {
    await addHousingCompleteWorksheet(
      workbook,
      housingList,
      housingAddresses,
      ownerAddresses,
      campaignList
    );
  }

  await exportFileService.sendWorkbook(workbook, fileName, response);
};

const addOwnerWorksheet = (
  workbook: Workbook,
  housingList: HousingApi[],
  housingAddresses: AddressApi[],
  ownerAddresses: AddressApi[]
) => {
  const ownerWorksheet = workbook.addWorksheet('Propriétaires');

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
      header: 'Adresse LOVAC du propriétaire - Ligne 1',
      key: 'ownerRawAddress1',
    },
    {
      header: 'Adresse LOVAC du propriétaire - Ligne 2',
      key: 'ownerRawAddress2',
    },
    {
      header: 'Adresse LOVAC du propriétaire - Ligne 3',
      key: 'ownerRawAddress3',
    },
    {
      header: 'Adresse LOVAC du propriétaire - Ligne 4',
      key: 'ownerRawAddress4',
    },
    { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
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
      const rawAddress = ownerHousing.owner.rawAddress;
      const row: any = {
        owner: ownerHousing.owner.fullName,
        ownerRawAddress: reduceStringArray(rawAddress),
        ownerRawAddress1: rawAddress[0],
        ownerRawAddress2: rawAddress.length > 2 ? rawAddress[1] : undefined,
        ownerRawAddress3: rawAddress.length > 3 ? rawAddress[1] : undefined,
        ownerRawAddress4: rawAddress[rawAddress.length - 1],
        ownerAddress: formatAddressApi(ownerAddress),
        ownerAddressHouseNumber: ownerAddress?.houseNumber,
        ownerAddressStreet: ownerAddress?.street,
        ownerAddressPostalCode: ownerAddress?.postalCode,
        ownerAddressCity: ownerAddress?.city,
        ownerAddressScore: ownerAddress?.score,
      };

      ownerHousing.housingList.forEach((housing, index) => {
        row[`housingRawAddress_${index}`] = reduceStringArray(
          ownerHousing.housingList[index]?.rawAddress
        );
        row[`housingAddress_${index}`] = reduceAddressApi(
          housingAddresses.find((_) => _.refId === housing.id)
        );
      });

      ownerWorksheet.addRow(row);
    }
  );
};

const getHousingLightRow = (
  housingApi: HousingApi,
  housingAddresses: AddressApi[],
  ownerAddresses: AddressApi[]
) => {
  const housingAddress = housingAddresses.find(
    (_) => _.refId === housingApi.id
  );
  const ownerAddress = ownerAddresses.find(
    (_) => _.refId === housingApi.owner.id
  );
  const rawAddress = housingApi.owner.rawAddress;
  return {
    invariant: housingApi.invariant,
    cadastralReference: housingApi.cadastralReference,
    owner: housingApi.owner.fullName,
    ownerRawAddress: reduceStringArray(housingApi.owner.rawAddress),
    ownerRawAddress1: rawAddress[0],
    ownerRawAddress2: rawAddress.length > 2 ? rawAddress[1] : undefined,
    ownerRawAddress3: rawAddress.length > 3 ? rawAddress[1] : undefined,
    ownerRawAddress4: rawAddress[rawAddress.length - 1],
    ownerAddress: formatAddressApi(ownerAddress),
    ownerAddressHouseNumber: ownerAddress?.houseNumber,
    ownerAddressStreet: ownerAddress?.street,
    ownerAddressPostalCode: ownerAddress?.postalCode,
    ownerAddressCity: ownerAddress?.city,
    ownerAddressScore: ownerAddress?.score,
    housingRawAddress: reduceStringArray(housingApi.rawAddress),
    housingAddress: reduceAddressApi(housingAddress),
  };
};

const housingLightColumns = [
  { header: 'Invariant', key: 'invariant' },
  { header: 'Référence cadastrale', key: 'cadastralReference' },
  { header: 'Propriétaire', key: 'owner' },
  { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 1',
    key: 'ownerRawAddress1',
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 2',
    key: 'ownerRawAddress2',
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 3',
    key: 'ownerRawAddress3',
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 4',
    key: 'ownerRawAddress4',
  },
  { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
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

const addHousingLightWorksheet = (
  workbook: Workbook,
  housingList: HousingApi[],
  housingAddresses: AddressApi[],
  ownerAddresses: AddressApi[]
) => {
  const housingWorksheet = workbook.addWorksheet('Logements');

  housingWorksheet.columns = housingLightColumns;

  housingList.forEach((housing: HousingApi) => {
    housingWorksheet.addRow(
      getHousingLightRow(housing, housingAddresses, ownerAddresses)
    );
  });
};

const addHousingCompleteWorksheet = async (
  workbook: Workbook,
  housingList: HousingApi[],
  housingAddresses: AddressApi[],
  ownerAddresses: AddressApi[],
  campaignList: CampaignApi[]
) => {
  const housingWorksheet = workbook.addWorksheet('Logements');

  housingWorksheet.columns = [
    ...housingLightColumns,
    { header: 'latitude', key: 'latitude' },
    { header: 'Longitude', key: 'longitude' },
    { header: 'Cause de la vacance', key: 'vacancyReasons' },
    { header: 'Campagne(s)', key: 'campaigns' },
    { header: 'Statut', key: 'status' },
    { header: 'Sous-statut', key: 'subStatus' },
    { header: 'Précision(s)', key: 'precisions' },
    { header: "Nombre d'événements", key: 'contactCount' },
    { header: 'Date de dernière mise à jour', key: 'lastContact' },
  ];

  housingList.forEach((housing: HousingApi) => {
    housingWorksheet.addRow({
      ...getHousingLightRow(housing, housingAddresses, ownerAddresses),
      latitude: housing.latitude,
      longitude: housing.longitude,
      vacancyReasons: reduceStringArray(housing.vacancyReasons),
      campaigns: reduceStringArray(
        housing.campaignIds.map(
          (campaignId) => campaignList.find((c) => c.id === campaignId)?.title
        )
      ),
      status: getHousingStatusApiLabel(housing.status),
      subStatus: housing.subStatus,
      precisions: reduceStringArray(housing.precisions),
      contactCount: housing.contactCount,
      lastContact: housing.lastContact,
    });
  });
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

const housingController = {
  get,
  list,
  count,
  listByOwner,
  updateHousingValidators,
  updateHousing,
  updateHousingListValidators,
  updateHousingList,
  exportHousingByCampaignBundle,
};

export default housingController;
