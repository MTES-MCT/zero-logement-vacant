import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import { getBuildingLocation, HousingApi } from '../models/HousingApi';
import campaignRepository from '../repositories/campaignRepository';
import {
  AddressApi,
  AddressKinds,
  formatAddressApi,
} from '../models/AddressApi';
import { AuthenticatedRequest } from 'express-jwt';
import { getHousingStatusApiLabel } from '../models/HousingStatusApi';
import { constants } from 'http2';
import banAddressesRepository from '../repositories/banAddressesRepository';
import mailService from '../services/mailService';
import establishmentRepository from '../repositories/establishmentRepository';
import { reduceStringArray } from '../utils/stringUtils';
import highland from 'highland';
import { CampaignApi } from '../models/CampaignApi';
import { logger } from '../utils/logger';
import excelUtils from '../utils/excelUtils';
import Stream = Highland.Stream;
import WorkbookWriter = exceljs.stream.xlsx.WorkbookWriter;
import exceljs from 'exceljs';

const exportHousingByCampaignBundle = async (
  request: Request,
  response: Response
) => {
  const campaignNumber = request.params.campaignNumber;
  const reminderNumber = request.params.reminderNumber;
  const { auth, user } = request as AuthenticatedRequest;
  const { establishmentId } = auth;

  logger.info(
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

  const stream = housingRepository.streamWithFilters({
    establishmentIds: [establishmentId],
    campaignIds: campaignApi.campaignIds,
  });

  const fileName = campaignNumber
    ? `${campaignApi.title}.xlsx`
    : 'LogementSuivis.xlsx';

  const workbook = excelUtils.initWorkbook(fileName, response);

  writeWorkbook(
    stream,
    fileName,
    campaignNumber ? ['owner', 'housing:light'] : ['housing:complete'],
    campaignList,
    workbook
  ).done(() => {
    mailService.emit('housing:exported', user.email, {
      priority: establishment.priority,
    });

    return response;
  });
};

const writeWorkbook = (
  stream: Stream<HousingApi>,
  fileName: string,
  worksheets: ('owner' | 'housing:light' | 'housing:complete')[],
  campaignList: CampaignApi[],
  workbook: WorkbookWriter
) => {
  const housingLightWorksheet = worksheets.includes('housing:light')
    ? addHousingLightWorksheet(workbook)
    : undefined;
  const housingCompleteWorksheet = worksheets.includes('housing:complete')
    ? addHousingCompleteWorksheet(workbook)
    : undefined;
  const ownerWorksheet = worksheets.includes('owner')
    ? addOwnerWorksheet(workbook)
    : undefined;

  const ownersRowNumber: string[] = [];

  return stream
    .flatMap((housingApi) =>
      highland([
        highland(
          banAddressesRepository.getByRefId(housingApi.id, AddressKinds.Housing)
        ),
        highland(
          banAddressesRepository.getByRefId(
            housingApi.owner.id,
            AddressKinds.Owner
          )
        ),
      ])
        .parallel(2)
        .collect()
        .map(([housingAddress, ownerAddress]) => ({
          ...housingApi,
          housingAddress,
          ownerAddress,
        }))
    )
    .tap((housingWithAddresses) => {
      if (housingLightWorksheet) {
        housingLightWorksheet.addRow(
          getHousingLightRow(
            housingWithAddresses,
            housingWithAddresses.housingAddress ?? undefined,
            housingWithAddresses.ownerAddress ?? undefined
          )
        );
      }
      if (housingCompleteWorksheet) {
        housingCompleteWorksheet.addRow({
          ...getHousingLightRow(
            housingWithAddresses,
            housingWithAddresses.housingAddress ?? undefined,
            housingWithAddresses.ownerAddress ?? undefined
          ),
          latitude: housingWithAddresses.latitude,
          longitude: housingWithAddresses.longitude,
          vacancyReasons: reduceStringArray(
            housingWithAddresses.vacancyReasons
          ),
          campaigns: reduceStringArray(
            housingWithAddresses.campaignIds.map(
              (campaignId) =>
                campaignList.find((c) => c.id === campaignId)?.title
            )
          ),
          status: getHousingStatusApiLabel(housingWithAddresses.status),
          subStatus: housingWithAddresses.subStatus,
          precisions: reduceStringArray(housingWithAddresses.precisions),
          contactCount: housingWithAddresses.contactCount,
          lastContact: housingWithAddresses.lastContact,
        });
      }
      if (ownerWorksheet) {
        if (!ownersRowNumber.includes(housingWithAddresses.owner.id)) {
          const ownerAddress = housingWithAddresses.ownerAddress ?? undefined;
          const rawAddress = housingWithAddresses.owner.rawAddress;
          ownerWorksheet.addRow({
            owner: housingWithAddresses.owner.fullName,
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
          });
          ownersRowNumber.push(housingWithAddresses.owner.id);
        }
        const row = ownerWorksheet.getRow(
          ownersRowNumber.indexOf(housingWithAddresses.owner.id) + 2
        );
        row.splice(
          row.cellCount + 1,
          0,
          reduceStringArray(housingWithAddresses.rawAddress),
          reduceAddressApi(housingWithAddresses.housingAddress ?? undefined)
        );
        const headerRow = ownerWorksheet.getRow(1);
        if (row.cellCount > headerRow.cellCount) {
          headerRow.splice(
            headerRow.cellCount + 1,
            0,
            ...[
              `Adresse LOVAC du logement ${
                (row.cellCount - ownerWorksheetColumns.length) / 2
              }`,
              `Adresse BAN du logement ${
                (row.cellCount - ownerWorksheetColumns.length) / 2
              }`,
            ]
          );
        }
        console.log('row count after', row.cellCount);
      }
    })
    .collect()
    .tap(() => {
      excelUtils.formatWorksheet(housingLightWorksheet);
      excelUtils.formatWorksheet(housingCompleteWorksheet);
      excelUtils.formatWorksheet(ownerWorksheet);
      workbook.commit();
    });
};

const ownerWorksheetColumns = [
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
];

const addOwnerWorksheet = (workbook: WorkbookWriter) => {
  const ownerWorksheet = workbook.addWorksheet('Propriétaires');

  ownerWorksheet.columns = ownerWorksheetColumns;

  return ownerWorksheet;
};

const getHousingLightRow = (
  housingApi: HousingApi,
  housingAddress?: AddressApi,
  ownerAddress?: AddressApi
) => {
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

const addHousingLightWorksheet = (workbook: WorkbookWriter) => {
  const housingWorksheet = workbook.addWorksheet('Logements');

  housingWorksheet.columns = housingLightColumns;

  return housingWorksheet;
};

const addHousingCompleteWorksheet = (workbook: WorkbookWriter) => {
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

  return housingWorksheet;
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
