import { NextFunction, Request, Response } from 'express';
import housingRepository from '~/repositories/housingRepository';
import {
  assertOwner,
  getBuildingLocation,
  HousingApi,
  OccupancyKindApiLabels
} from '~/models/HousingApi';
import campaignRepository from '~/repositories/campaignRepository';
import { AddressApi, formatAddressApi } from '~/models/AddressApi';
import { AuthenticatedRequest } from 'express-jwt';
import { getHousingStatusApiLabel } from '~/models/HousingStatusApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import { capitalize, reduceStringArray } from '~/utils/stringUtils';
import highland from 'highland';
import { CampaignApi } from '~/models/CampaignApi';
import { createLogger } from '~/infra/logger';
import excelUtils from '~/utils/excelUtils';
import exceljs from 'exceljs';
import groupRepository from '~/repositories/groupRepository';
import GroupMissingError from '~/errors/groupMissingError';
import { param, ValidationChain } from 'express-validator';
import CampaignMissingError from '~/errors/campaignMissingError';
import { OwnerApi } from '~/models/OwnerApi';
import ownerRepository from '~/repositories/ownerRepository';
import { AddressKinds } from '@zerologementvacant/shared';
import fp from 'lodash/fp';
import Stream = Highland.Stream;
import WorkbookWriter = exceljs.stream.xlsx.WorkbookWriter;

const logger = createLogger('housingExportController');

export type OwnerExportStreamApi = OwnerApi & { housingList: HousingApi[] };

const exportCampaignValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID')
];
const exportCampaign = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { auth, params } = request as AuthenticatedRequest;

  logger.info('Export campaign', {
    id: params.id
  });

  const campaigns = await campaignRepository.find({
    filters: {
      establishmentId: auth.establishmentId
    }
  });
  const campaign = campaigns.find((campaign) => campaign.id === params.id);
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  logger.debug('Found campaign', { campaign: campaign.title });
  const fileName = `${campaign.title}.xlsx`;
  const workbook = excelUtils.initWorkbook(fileName, response);
  const housingStream = housingRepository.stream({
    filters: {
      campaignIds: [campaign.id],
      establishmentIds: [auth.establishmentId]
    },
    includes: ['owner', 'events']
  });

  const ownerStream = ownerRepository.exportStream({
    filters: {
      campaignId: campaign.id
    }
  });

  highland([
    writeHousingWorksheet(housingStream, campaigns, workbook),
    writeOwnerWorksheet(ownerStream, workbook)
  ])
    .merge()
    .stopOnError((error) => {
      logger.error('Stream error', { error });
      next(error);
      throw error;
    })
    .done(async () => {
      await workbook.commit();
      logger.info('Workbook committed');
      logger.info('Campaign exported', { campaign: campaign.id });
    });
};

const exportGroup = async (request: Request, response: Response) => {
  const { auth, params } = request as AuthenticatedRequest;

  logger.info('Export group', {
    id: params.id
  });

  const [group, campaigns] = await Promise.all([
    groupRepository.findOne({
      id: params.id,
      establishmentId: auth.establishmentId
    }),
    campaignRepository.find({
      filters: {
        establishmentId: auth.establishmentId
      }
    })
  ]);

  if (!group) {
    throw new GroupMissingError(params.id);
  }
  const fileName = `${group.title}.xlsx`;
  const workbook = excelUtils.initWorkbook(fileName, response);

  const housingStream = housingRepository.stream({
    filters: {
      groupIds: [params.id],
      establishmentIds: [auth.establishmentId]
    },
    includes: ['owner', 'events']
  });

  const ownerStream = ownerRepository.exportStream({
    filters: {
      groupId: group.id
    }
  });

  logger.info('Writing worksheets...');
  highland([
    writeHousingWorksheet(housingStream, campaigns, workbook),
    writeOwnerWorksheet(ownerStream, workbook)
  ])
    .merge()
    .done(async () => {
      await workbook.commit();
      await groupRepository.save({
        ...group,
        exportedAt: group.exportedAt ?? new Date()
      });
      logger.info('Exported group', { group: group.id });
    });
};

const exportGroupValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID')
];

function writeHousingWorksheet(
  stream: Stream<HousingApi>,
  campaigns: CampaignApi[],
  workbook: WorkbookWriter
): Stream<void> {
  const housingWorksheet = addHousingtWorksheet(workbook);

  return stream
    .flatMap((housing) => {
      assertOwner(housing);
      return highland<void>(
        Promise.all([
          banAddressesRepository.getByRefId(housing.id, AddressKinds.Housing),
          banAddressesRepository.getByRefId(
            housing.owner.id,
            AddressKinds.Owner
          )
        ]).then(([housingAddress, ownerAddress]) => {
          const building = getBuildingLocation(housing);

          logger.debug('Writing housing row...', {
            housing: fp.pick(['id', 'geoCode', 'localId'], housing)
          });
          const row = {
            invariant: housing.invariant,
            cadastralReference: housing.cadastralReference,
            geoCode: housing.geoCode,
            housingRawAddress: reduceStringArray(housing.rawAddress),
            housingAddress: reduceAddressApi(housingAddress),
            housingAddressScore: housingAddress?.score,
            latitude: housing.latitude,
            longitude: housing.longitude,
            buildingLocation: building
              ? [
                  building.building,
                  building.entrance,
                  building.level,
                  building.local
                ].join(', ')
              : null,
            housingKind:
              housing.housingKind === 'APPART'
                ? 'Appartement'
                : capitalize(housing.housingKind),
            energyConsumption: housing.energyConsumption,
            energyConsumptionAt: housing.energyConsumptionAt,
            livingArea: housing.livingArea,
            roomsCount: housing.roomsCount,
            buildingYear: housing.buildingYear,
            occupancy: OccupancyKindApiLabels[housing.occupancy],
            vacancyStartYear: housing.vacancyStartYear,
            status: getHousingStatusApiLabel(housing.status),
            subStatus: housing.subStatus,
            vacancyReasons: reduceStringArray(housing.vacancyReasons),
            precisions: reduceStringArray(housing.precisions),
            campaigns: reduceStringArray(
              housing.campaignIds?.map(
                (campaignId) =>
                  campaigns.find((c) => c.id === campaignId)?.title
              )
            ),
            contactCount: housing.contactCount,
            lastContact: housing.lastContact,
            ...ownerRowData(housing.owner, ownerAddress)
          };

          housingWorksheet.addRow(row).commit();
          logger.info('Wrote housing row', {
            housing: fp.pick(['id', 'geoCode', 'localId'], housing)
          });
        })
      );
    })
    .stopOnError((error) => {
      logger.error('Housing stream error', { error });
      throw error;
    })
    .on('end', () => {
      housingWorksheet.commit();
      logger.info('Wrote housing worksheet');
    });
}
function writeOwnerWorksheet(
  stream: Stream<OwnerExportStreamApi>,
  workbook: WorkbookWriter
): Stream<void> {
  return stream
    .flatMap((owner) => {
      return highland(
        Promise.all([
          banAddressesRepository.getByRefId(owner.id, AddressKinds.Owner),
          ...owner.housingList.map((housingApi) =>
            banAddressesRepository
              .getByRefId(housingApi.id, AddressKinds.Housing)
              .then((housingAddress) => ({ housingApi, housingAddress }))
          )
        ]).then(([ownerAddress, ...housings]) => {
          if (!workbook.getWorksheet('Propriétaires')) {
            addOwnerWorksheet(
              workbook,
              housings.map(({ housingApi }) => housingApi)
            );
          }

          const ownerWorksheet = workbook.getWorksheet('Propriétaires');
          logger.debug('Writing owner row...', {
            owner: fp.pick(['id', 'fullName'], owner)
          });
          const row = housings.reduce(
            (prev, { housingApi, housingAddress }, index) => ({
              ...prev,
              [`housingRawAddress${index + 1}`]: reduceStringArray(
                housingApi.rawAddress
              ),
              [`housingAddress${index + 1}`]: reduceAddressApi(
                housingAddress ?? undefined
              )
            }),
            ownerRowData(owner, ownerAddress ?? undefined)
          );
          ownerWorksheet?.addRow(row).commit();
          logger.info('Wrote owner row', {
            owner: fp.pick(['id', 'fullName'], owner)
          });
        })
      );
    })
    .stopOnError((error) => {
      logger.error('Housing stream error', { error });
      throw error;
    })
    .on('end', () => {
      workbook.getWorksheet('Propriétaires')?.commit();
      logger.info('Owner worksheet written');
    });
}

function ownerRowData(
  owner: OwnerApi,
  ownerAddress?: AddressApi | null | undefined
) {
  const rawAddress = owner.rawAddress;
  return {
    owner: owner.fullName,
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
    ownerAddressScore: ownerAddress?.score
  };
}

const ownerWorksheetColumns = [
  { header: 'Propriétaire', key: 'owner' },
  { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 1',
    key: 'ownerRawAddress1'
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 2',
    key: 'ownerRawAddress2'
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 3',
    key: 'ownerRawAddress3'
  },
  {
    header: 'Adresse LOVAC du propriétaire - Ligne 4',
    key: 'ownerRawAddress4'
  },
  { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
  {
    header: 'Adresse BAN du propriétaire - Numéro',
    key: 'ownerAddressHouseNumber'
  },
  { header: 'Adresse BAN du propriétaire - Rue', key: 'ownerAddressStreet' },
  {
    header: 'Adresse BAN du propriétaire - Code postal',
    key: 'ownerAddressPostalCode'
  },
  { header: 'Adresse BAN du propriétaire - Ville', key: 'ownerAddressCity' },
  {
    header: 'Adresse BAN du propriétaire - Fiabilité',
    key: 'ownerAddressScore'
  }
];

const addOwnerWorksheet = (
  workbook: WorkbookWriter,
  housingList: HousingApi[]
) => {
  const ownerWorksheet = workbook.addWorksheet('Propriétaires');
  ownerWorksheet.columns = [
    ...ownerWorksheetColumns,
    ...housingList
      .map((_, index) => [
        {
          header: `Adresse LOVAC du logement ${index + 1}`,
          key: `housingRawAddress${index + 1}`
        },
        {
          header: `Adresse BAN du logement ${index + 1}`,
          key: `housingAddress${index + 1}`
        }
      ])
      .flat()
  ];

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
    key: 'housingAddressScore'
  },
  { header: 'Latitude', key: 'latitude' },
  { header: 'Longitude', key: 'longitude' },
  { header: 'Localisation', key: 'buildingLocation' },
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
  ...ownerWorksheetColumns
];

const addHousingtWorksheet = (workbook: WorkbookWriter) => {
  const housingWorksheet = workbook.addWorksheet('Logements');
  housingWorksheet.columns = housingWorksheetColumns;

  return housingWorksheet;
};

const reduceAddressApi = (addressApi?: AddressApi | null | undefined) => {
  return addressApi
    ? [
        addressApi.houseNumber,
        addressApi.street,
        addressApi.postalCode,
        addressApi.city
      ]
        .filter((_) => _)
        .join(' ')
    : addressApi;
};

const housingExportController = {
  exportCampaign,
  exportCampaignValidators,
  exportGroup,
  exportGroupValidators
};

export default housingExportController;
