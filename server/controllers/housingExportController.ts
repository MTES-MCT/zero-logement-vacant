import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import { getBuildingLocation, HousingApi } from '../models/HousingApi';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS, { Workbook } from 'exceljs';
import {
  AddressApi,
  AddressKinds,
  formatAddressApi,
} from '../models/AddressApi';
import { OwnerApi } from '../models/OwnerApi';
import { AuthenticatedRequest } from 'express-jwt';
import { getHousingStatusApiLabel } from '../models/HousingStatusApi';
import exportFileService from '../services/exportFileService';
import { constants } from 'http2';
import banAddressesRepository from '../repositories/banAddressesRepository';
import mailService from '../services/mailService';
import establishmentRepository from '../repositories/establishmentRepository';
import { CampaignApi } from '../models/CampaignApi';
import { reduceStringArray } from '../utils/stringUtils';

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
    ? `${campaignApi.title}.xlsx`
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
    addHousingCompleteWorksheet(
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
  const building = getBuildingLocation(housingApi);
  return {
    invariant: housingApi.invariant,
    cadastralReference: housingApi.cadastralReference,
    geoCode: housingApi.geoCode,
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
    vacancyStartYear: housingApi.vacancyStartYear,
    buildingLocation: building
      ? [
          building.building,
          building.entrance,
          building.level,
          building.local,
        ].join(', ')
      : null,
  };
};

const housingLightColumns = [
  { header: 'Invariant', key: 'invariant' },
  { header: 'Référence cadastrale', key: 'cadastralReference' },
  { header: 'Code INSEE commune du logement', key: 'geoCode' },
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
  { header: 'Date de début de vacance', key: 'vacancyStartYear' },
  { header: 'Emplacement du local', key: 'buildingLocation' },
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

const addHousingCompleteWorksheet = (
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

const housingExportController = {
  exportHousingByCampaignBundle,
};

export default housingExportController;
