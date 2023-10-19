import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  getBuildingLocation,
  HousingApi,
  OccupancyKindApiLabels,
} from '../models/HousingApi';
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
import { capitalize, reduceStringArray } from '../utils/stringUtils';
import highland from 'highland';
import { CampaignApi } from '../models/CampaignApi';
import { logger } from '../utils/logger';
import excelUtils from '../utils/excelUtils';
import exceljs from 'exceljs';
import groupRepository from '../repositories/groupRepository';
import GroupMissingError from '../errors/groupMissingError';
import { param, ValidationChain } from 'express-validator';
import Stream = Highland.Stream;
import WorkbookWriter = exceljs.stream.xlsx.WorkbookWriter;

interface HousindWithAddresses extends HousingApi {
  housingAddress?: AddressApi;
  ownerAddress?: AddressApi;
}

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
    ['owner', 'housing'],
    campaignList,
    workbook
  ).done(() => {
    mailService.emit('housing:exported', user.email, {
      priority: establishment.priority,
    });
  });
};

const exportGroup = async (request: Request, response: Response) => {
  const { auth, params } = request as AuthenticatedRequest;

  logger.info('Export group', {
    id: params.id,
  });

  const [group, campaigns] = await Promise.all([
    groupRepository.findOne({
      id: params.id,
      establishmentId: auth.establishmentId,
    }),
    campaignRepository.listCampaigns(auth.establishmentId),
  ]);

  if (!group) {
    throw new GroupMissingError(params.id);
  }

  const stream = housingRepository.streamWithFilters({
    groupIds: [params.id],
    establishmentIds: [auth.establishmentId],
  });
  const fileName = `${group.title}.xlsx`;
  const workbook = excelUtils.initWorkbook(fileName, response);
  writeWorkbook(
    stream,
    fileName,
    ['owner', 'housing'],
    campaigns,
    workbook
  ).done(() => {
    logger.info('Exported group', { group: group.id });
  });
};
const exportGroupValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID'),
];

const writeWorkbook = (
  stream: Stream<HousingApi>,
  fileName: string,
  worksheets: ('owner' | 'housing')[],
  campaignList: CampaignApi[],
  workbook: WorkbookWriter
) => {
  const housingWorksheet = worksheets.includes('housing')
    ? addHousingtWorksheet(workbook)
    : undefined;
  const ownerWorksheet = worksheets.includes('owner')
    ? addOwnerWorksheet(workbook)
    : undefined;

  const ownersRowNumber: string[] = [];

  return stream
    .flatMap((housingApi) =>
      highland(
        Promise.all([
          banAddressesRepository.getByRefId(
            housingApi.id,
            AddressKinds.Housing
          ),
          banAddressesRepository.getByRefId(
            housingApi.owner.id,
            AddressKinds.Owner
          ),
        ]).then(
          ([housingAddress, ownerAddress]): HousindWithAddresses => ({
            ...housingApi,
            housingAddress: housingAddress ?? undefined,
            ownerAddress: ownerAddress ?? undefined,
          })
        )
      )
    )
    .tap((housingWithAddresses) => {
      if (housingWorksheet) {
        const housingAddress = housingWithAddresses.housingAddress ?? undefined;
        const building = getBuildingLocation(housingWithAddresses);

        housingWorksheet.addRow({
          invariant: housingWithAddresses.invariant,
          cadastralReference: housingWithAddresses.cadastralReference,
          geoCode: housingWithAddresses.geoCode,
          housingRawAddress: reduceStringArray(housingWithAddresses.rawAddress),
          housingAddress: reduceAddressApi(housingAddress),
          housingAddressScore: housingAddress?.score,
          latitude: housingWithAddresses.latitude,
          longitude: housingWithAddresses.longitude,
          buildingLocation: building
            ? [
                building.building,
                building.entrance,
                building.level,
                building.local,
              ].join(', ')
            : null,
          housingKind:
            housingWithAddresses.housingKind === 'APPART'
              ? 'Appartement'
              : capitalize(housingWithAddresses.housingKind),
          energyConsumption: housingWithAddresses.energyConsumption,
          energyConsumptionAt: housingWithAddresses.energyConsumptionAt,
          livingArea: housingWithAddresses.livingArea,
          roomsCount: housingWithAddresses.roomsCount,
          buildingYear: housingWithAddresses.buildingYear,
          occupancy: OccupancyKindApiLabels[housingWithAddresses.occupancy],
          vacancyStartYear: housingWithAddresses.vacancyStartYear,
          status: getHousingStatusApiLabel(housingWithAddresses.status),
          subStatus: housingWithAddresses.subStatus,
          vacancyReasons: reduceStringArray(
            housingWithAddresses.vacancyReasons
          ),
          precisions: reduceStringArray(housingWithAddresses.precisions),
          campaigns: reduceStringArray(
            housingWithAddresses.campaignIds.map(
              (campaignId) =>
                campaignList.find((c) => c.id === campaignId)?.title
            )
          ),
          contactCount: housingWithAddresses.contactCount,
          lastContact: housingWithAddresses.lastContact,
          ...ownerRowData(housingWithAddresses),
        });
      }
      if (ownerWorksheet) {
        if (!ownersRowNumber.includes(housingWithAddresses.owner.id)) {
          ownerWorksheet.addRow(ownerRowData(housingWithAddresses));
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
      }
    })
    .collect()
    .tap(() => {
      excelUtils.formatWorksheet(housingWorksheet);
      excelUtils.formatWorksheet(ownerWorksheet);
      workbook.commit();
    });
};

const ownerRowData = (housingWithAddresses: HousindWithAddresses) => {
  const ownerAddress = housingWithAddresses.ownerAddress ?? undefined;
  const rawAddress = housingWithAddresses.owner.rawAddress;
  return {
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
  };
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

const housingWorksheetColumns = [
  { header: 'Invariant', key: 'invariant' },
  { header: 'Référence cadastrale', key: 'cadastralReference' },
  { header: 'Code INSEE commune du logement', key: 'geoCode' },
  { header: 'Adresse LOVAC du logement', key: 'housingRawAddress' },
  { header: 'Adresse BAN du logement', key: 'housingAddress' },
  {
    header: 'Adresse BAN du logement - Fiabilité',
    key: 'housingAddressScore',
  },
  { header: 'Latitude', key: 'latitude' },
  { header: 'Longitude', key: 'longitude' },
  { header: 'Emplacement', key: 'buildingLocation' },
  { header: 'Type de logement', key: 'housingKind' },
  { header: 'DPE représentatif', key: 'energyConsumption' },
  { header: 'Date DPE', key: 'energyConsumptionAt' },
  { header: 'Surface', key: 'livingArea' },
  { header: 'Nombre de pièces', key: 'roomsCount' },
  { header: 'Date de construction', key: 'buildingYear' },
  { header: 'Occupation', key: 'occupancy' },
  { header: 'Date de début de vacance', key: 'vacancyStartYear' },
  { header: 'Statut', key: 'status' },
  { header: 'Sous-statut', key: 'subStatus' },
  { header: 'Point(s) de blocage', key: 'vacancyReasons' },
  { header: 'Dispositif(s)', key: 'precisions' },
  { header: 'Campagne(s)', key: 'campaigns' },
  { header: "Nombre d'événements", key: 'contactCount' },
  { header: 'Date de dernière mise à jour', key: 'lastContact' },
  ...ownerWorksheetColumns,
];

const addHousingtWorksheet = (workbook: WorkbookWriter) => {
  const housingWorksheet = workbook.addWorksheet('Logements');
  housingWorksheet.columns = housingWorksheetColumns;

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
  exportGroup,
  exportGroupValidators,
};

export default housingExportController;
