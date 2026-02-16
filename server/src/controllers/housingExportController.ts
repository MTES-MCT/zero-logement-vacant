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
import { Predicate } from 'effect';
import { type Column, type Workbook } from 'exceljs';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { param, ValidationChain } from 'express-validator';
import { map } from 'web-streams-utils';

import CampaignMissingError from '~/errors/campaignMissingError';
import GroupMissingError from '~/errors/groupMissingError';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { CampaignApi } from '~/models/CampaignApi';
import { getBuildingLocation, HousingApi } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import campaignRepository from '~/repositories/campaignRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import ownerRepository from '~/repositories/ownerRepository';
import excelUtils from '~/utils/excelUtils';

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

  const housingStream = housingRepository.stream({
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
  const workbook = excelUtils.createWorkbook(response);
  excelUtils.setResponseHeaders(response, {
    fileName: `${file}.xlsx`
  });

  const housingStream = housingRepository.stream({
    filters: {
      groupIds: [params.id],
      establishmentIds: [auth.establishmentId]
    },
    includes: ['owner', 'campaigns', 'precisions']
  });
  const ownerStream = ownerRepository.stream({
    filters: {
      groupId: group.id
    },
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

  await workbook.commit();
  await groupRepository.save({
    ...group,
    exportedAt: group.exportedAt ?? new Date()
  });
  logger.info('Group exported', group);
}

const exportGroupValidators: ValidationChain[] = [
  param('id').isUUID().withMessage('Must be an UUID')
];

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
