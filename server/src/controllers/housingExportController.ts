import {
  AddressKinds,
  formatAddress,
  HOUSING_STATUS_LABELS,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { slugify, timestamp } from '@zerologementvacant/utils';
import { Predicate, Struct } from 'effect';
import exceljs, { type Column, type Workbook } from 'exceljs';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { param, ValidationChain } from 'express-validator';
import highland from 'highland';
import { map } from 'web-streams-utils';

import CampaignMissingError from '~/errors/campaignMissingError';
import GroupMissingError from '~/errors/groupMissingError';
import { createLogger } from '~/infra/logger';
import { AddressApi, formatAddressApi } from '~/models/AddressApi';
import { CampaignApi } from '~/models/CampaignApi';
import {
  assertOwner,
  getBuildingLocation,
  HousingApi
} from '~/models/HousingApi';
import { getHousingStatusLabel } from '~/models/HousingStatusApi';
import { OwnerApi } from '~/models/OwnerApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import campaignRepository from '~/repositories/campaignRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import ownerRepository from '~/repositories/ownerRepository';
import excelUtils from '~/utils/excelUtils';
import { capitalize, reduceStringArray } from '~/utils/stringUtils';
import WorkbookWriter = exceljs.stream.xlsx.WorkbookWriter;
import Stream = Highland.Stream;

const logger = createLogger('housingExportController');

const MAX_TITLE_LENGTH = 100;

export type OwnerExportStreamApi = OwnerApi & { housingList: HousingApi[] };

const exportCampaignValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID')
];

async function exportCampaign(request: Request, response: Response) {
  const { auth, establishment, params } = request as AuthenticatedRequest;

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

  const file = timestamp()
    .concat('-', slugify(campaign.title))
    .substring(0, MAX_TITLE_LENGTH);
  logger.debug('Found campaign', {
    campaign: campaign.title,
    file
  });
  const workbook = excelUtils.createWorkbook(response);
  excelUtils.setResponseHeaders(response, {
    fileName: `${file}.xlsx`
  });

  const housingStream = housingRepository.betterStream({
    filters: {
      campaignIds: [campaign.id],
      establishmentIds: [auth.establishmentId],
      localities: establishment.geoCodes
    },
    includes: ['owner', 'campaigns', 'precisions']
  });

  const ownerStream = ownerRepository.stream({
    filters: {
      campaignId: campaign.id
    },
    groupBy: ['full_name', 'id'],
    includes: ['banAddress', 'housings']
  });

  await Promise.all([
    createHousingWorksheet({
      workbook,
      stream: housingStream,
      campaigns
    }),
    createOwnerWorksheet({
      workbook,
      stream: ownerStream
    })
  ]);
  workbook.commit();
  logger.info('Campaign exported', { campaign: campaign.id });
}

async function exportGroup(request: Request, response: Response) {
  const { auth, params } = request as AuthenticatedRequest;

  logger.info('Exporting group...', {
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

  const file = timestamp()
    .concat('-', slugify(group.title))
    .substring(0, MAX_TITLE_LENGTH);
  const workbook = excelUtils.initWorkbook(`${file}.xlsx`, response);

  const housingStream = housingRepository.stream({
    filters: {
      groupIds: [params.id],
      establishmentIds: [auth.establishmentId]
    },
    includes: ['owner']
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
}

const exportGroupValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID')
];

function writeHousingWorksheet(
  stream: Stream<HousingApi>,
  campaigns: CampaignApi[],
  workbook: WorkbookWriter
): Stream<void> {
  logger.debug('Writing housing worksheet...');
  const housingWorksheet = addHousingtWorksheet(workbook);

  return stream
    .flatMap((housing) => {
      logger.debug('Processing housing...', {
        housing
      });
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
            housing: Struct.pick(housing, 'id', 'geoCode', 'localId')
          });
          const row = {
            invariant: housing.invariant,
            localId: housing.localId,
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
            occupancy: OCCUPANCY_LABELS[housing.occupancy],
            vacancyStartYear: housing.vacancyStartYear,
            status: getHousingStatusLabel(housing.status) ?? '',
            subStatus: housing.subStatus,
            vacancyReasons: reduceStringArray(
              housing.deprecatedVacancyReasons ?? undefined
            ),
            precisions: reduceStringArray(
              housing.deprecatedPrecisions ?? undefined
            ),
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
            housing: Struct.pick(housing, 'id', 'geoCode', 'localId')
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
            owner: Struct.pick(owner, 'id', 'fullName')
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
            owner: Struct.pick(owner, 'id', 'fullName')
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
    ownerRawAddress: rawAddress ? reduceStringArray(rawAddress) : undefined,
    ownerRawAddress1: rawAddress ? rawAddress[0] : undefined,
    ownerRawAddress2:
      rawAddress && rawAddress.length > 2 ? rawAddress[1] : undefined,
    ownerRawAddress3:
      rawAddress && rawAddress.length > 3 ? rawAddress[1] : undefined,
    ownerRawAddress4: rawAddress
      ? rawAddress[rawAddress.length - 1]
      : undefined,
    ownerAddress: formatAddressApi(ownerAddress),
    ownerAddressHouseNumber: ownerAddress?.houseNumber,
    ownerAddressStreet: ownerAddress?.street,
    ownerAdditionalAddress: owner?.additionalAddress,
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
  },
  {
    header: "Complément d'adresse du propriétaire",
    key: 'ownerAdditionalAddress'
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
  { header: 'Identifiant fiscal départemental', key: 'invariant' },
  { header: 'Identifiant fiscal national', key: 'localId' },
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
  logger.debug('Adding housing worksheet...');
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

interface CreateOwnerWorksheetOptions {
  workbook: Workbook;
  stream: ReadableStream<OwnerApi & { housings?: ReadonlyArray<HousingApi> }>;
}

export function toOwnerExcelRow(
  owner: OwnerApi & { housings?: ReadonlyArray<HousingApi> }
) {
  return {
    ownerName: owner.fullName,
    ownerRawAddress: owner.rawAddress?.join('\n'),
    ownerBanAddress: owner.banAddress?.label,
    ownerBanAddressScore: owner.banAddress?.score
      ? `${Math.trunc(owner.banAddress.score * 100)} %`
      : null,
    ownerAdditionalAddress: owner.additionalAddress
  };
}

export const OWNER_WORKSHEET_COLUMNS: Array<
  Partial<Column> & { key: keyof ReturnType<typeof toOwnerExcelRow> }
> = [
  { header: 'Propriétaire', key: 'ownerName' },
  { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
  { header: 'Adresse BAN du propriétaire', key: 'ownerBanAddress' },
  {
    header: 'Adresse BAN du propriétaire - Fiabilité',
    key: 'ownerBanAddressScore'
  },
  {
    header: 'Complément d’adresse du propriétaire',
    key: 'ownerAdditionalAddress'
  }
];

function createOwnerWorksheet(options: CreateOwnerWorksheetOptions) {
  const { workbook, stream } = options;

  return stream.pipeThrough(map(toOwnerExcelRow)).pipeTo(
    excelUtils.createWorksheet(workbook, {
      name: 'Propriétaires',
      columns: OWNER_WORKSHEET_COLUMNS
    })
  );
}

export interface CreateHousingWorksheetOptions {
  workbook: Workbook;
  stream: ReadableStream<HousingApi>;
  campaigns: ReadonlyArray<CampaignApi>;
}

async function createHousingWorksheet(
  options: CreateHousingWorksheetOptions
): Promise<void> {
  const { workbook, stream, campaigns } = options;
  return stream
    .pipeThrough(
      new TransformStream<
        HousingApi,
        { housing: HousingApi; banAddress: AddressApi | null }
      >({
        async transform(housing, controller) {
          const banAddress = await banAddressesRepository.getByRefId(
            housing.id,
            AddressKinds.Housing
          );
          controller.enqueue({
            housing,
            banAddress
          });
        }
      })
    )
    .pipeThrough(
      map(({ housing, banAddress }) => {
        const building = getBuildingLocation(housing);
        return {
          invariant: housing.invariant,
          localId: housing.localId,
          cadastralReference: housing.cadastralReference,
          geoCode: housing.geoCode,
          housingRawAddress: housing.rawAddress
            .filter(Predicate.isNotNullable)
            .join('\n'),
          housingAddress: banAddress
            ? formatAddress(banAddress).join('\n')
            : null,
          housingAddressScore: banAddress?.score,
          latitude: housing.latitude ?? banAddress?.latitude,
          longitude: housing.longitude ?? banAddress?.longitude,
          buildingLocation: building
            ? [
                building.building,
                building.entrance,
                building.level,
                building.local
              ].join('\n')
            : null,
          housingKind:
            housing.housingKind === 'APPART' ? 'Appartement' : 'Maison',
          energyConsumption: housing.energyConsumption,
          energyConsumptionAt: housing.energyConsumptionAt,
          livingArea: housing.livingArea,
          roomsCount: housing.roomsCount,
          buildingYear: housing.buildingYear,
          occupancy: OCCUPANCY_LABELS[housing.occupancy],
          vacancyStartYear: housing.vacancyStartYear,
          status: HOUSING_STATUS_LABELS[housing.status],
          subStatus: housing.subStatus,
          mechanisms: housing.precisions
            ?.filter((precision) =>
              isPrecisionMechanismCategory(precision.category)
            )
            ?.map((precision) => precision.label)
            ?.join('\n'),
          blockingPoints: housing.precisions
            ?.filter((precision) =>
              isPrecisionBlockingPointCategory(precision.category)
            )
            ?.map((precision) => precision.label)
            ?.join('\n'),
          evolutions: housing.precisions
            ?.filter((precision) =>
              isPrecisionEvolutionCategory(precision.category)
            )
            ?.map((precision) => precision.label)
            ?.join('\n'),
          campaigns: housing.campaignIds
            ?.filter(Predicate.isNotNullable)
            ?.map((id) => campaigns.find((campaign) => campaign.id === id))
            ?.map((campaign) => campaign?.title)
            ?.join('\n'),
          // Owner properties
          ...(housing.owner ? toOwnerExcelRow(housing.owner) : {})
        };
      })
    )
    .pipeTo(
      excelUtils.createWorksheet(workbook, {
        name: 'Logements',
        columns: [
          { header: 'Identifiant fiscal départemental', key: 'invariant' },
          { header: 'Identifiant fiscal national', key: 'localId' },
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
          { header: 'Dispositif(s)', key: 'mechanisms' },
          { header: 'Point(s) de blocage', key: 'blockingPoints' },
          { header: 'Évolution(s)', key: 'evolutions' },
          { header: 'Campagne(s)', key: 'campaigns' },
          ...OWNER_WORKSHEET_COLUMNS
        ]
      })
    );
}

const housingExportController = {
  exportCampaign,
  exportCampaignValidators,
  exportGroup,
  exportGroupValidators
};

export default housingExportController;
