import { OwnerRank, PropertyRight } from '@zerologementvacant/models';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { HousingApi, HousingRecordApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  housingTable,
  parseHousingRecordApi,
  type HousingRecordDBO
} from '~/repositories/housingRepository';

export const housingOwnersTable = 'owners_housing';

export const HousingOwners = (transaction = db) =>
  transaction<HousingOwnerDBO>(housingOwnersTable);

export interface FindByOwnerOptions {
  geoCodes?: ReadonlyArray<string>;
}

async function findByOwner(
  owner: OwnerApi,
  options?: FindByOwnerOptions
): Promise<
  ReadonlyArray<Omit<HousingOwnerApi, keyof OwnerApi> & HousingRecordApi>
> {
  logger.debug('Finding housing owners by owner...');

  const ownerHousings: ReadonlyArray<HousingOwnerDBO & HousingRecordDBO> =
    await HousingOwners()
      .select(`${housingOwnersTable}.*`)
      .where({
        owner_id: owner.id
      })
      .modify(query => {
        if (options?.geoCodes?.length) {
          query.whereIn(
            `${housingOwnersTable}.housing_geo_code`,
            options.geoCodes
          );
        }
      })
      .join(housingTable, (join) => {
        join
          .on(`${housingOwnersTable}.housing_id`, `${housingTable}.id`)
          .andOn(
            `${housingOwnersTable}.housing_geo_code`,
            `${housingTable}.geo_code`
          );
      })
      .select(`${housingTable}.*`);

  return ownerHousings.map(parseOwnerHousingApi);
}

async function insert(housingOwner: HousingOwnerApi): Promise<void> {
  logger.debug('Saving housing owner...', {
    housingOwner
  });

  await HousingOwners()
    .insert(formatHousingOwnerApi(housingOwner))
    .onConflict()
    .ignore();
  logger.debug('Saved housing owner.');
}

async function saveMany(housingOwners: HousingOwnerApi[]): Promise<void> {
  if (housingOwners.length) {
    housingOwners.forEach((housingOwner) => {
      logger.debug('Saving housing owner...', {
        housingOwner
      });
    });

    // Remove owners before inserting them back
    await withinTransaction(async (transaction) => {
      const housingGeoCode = housingOwners[0].housingGeoCode;
      const housingId = housingOwners[0].housingId;
      await HousingOwners(transaction)
        .where({
          housing_geo_code: housingGeoCode,
          housing_id: housingId
        })
        .delete();
      await HousingOwners(transaction).insert(
        housingOwners.map(formatHousingOwnerApi)
      );
    });
    logger.debug(`Saved ${housingOwners.length} housing owners.`);
  }
}

export interface HousingOwnerDBO {
  owner_id: string;
  housing_id: string;
  housing_geo_code: string;
  rank: OwnerRank;
  start_date?: Date | null;
  end_date?: Date | null;
  origin?: string | null;
  idprocpte?: string | null;
  idprodroit?: string | null;
  locprop_source?: string | null;
  property_right: PropertyRight | null;
}

export function parseOwnerHousingApi(
  ownerHousing: HousingOwnerDBO & HousingRecordDBO
): Omit<HousingOwnerApi, keyof OwnerApi> & HousingRecordApi {
  const owner: Omit<HousingOwnerApi, keyof OwnerApi> = {
    housingGeoCode: ownerHousing.geo_code,
    housingId: ownerHousing.id,
    ownerId: ownerHousing.owner_id,
    rank: ownerHousing.rank,
    startDate: ownerHousing.start_date,
    endDate: ownerHousing.end_date,
    origin: ownerHousing.origin ?? undefined,
    idprocpte: ownerHousing.idprocpte ?? undefined,
    idprodroit: ownerHousing.idprodroit ?? undefined,
    locprop:
      ownerHousing.locprop_source !== null
        ? Number(ownerHousing.locprop_source)
        : undefined,
    propertyRight: ownerHousing.property_right
  };
  const housing: HousingRecordApi = parseHousingRecordApi(ownerHousing);

  return {
    ...housing,
    ...owner
  };
}

export const formatOwnerHousingApi = (housing: HousingApi): HousingOwnerDBO => {
  if (!housing.owner) {
    throw new Error('Owner is required');
  }
  return {
    housing_id: housing.id,
    housing_geo_code: housing.geoCode,
    rank: 1,
    owner_id: housing.owner.id,
    property_right: null
  };
};

export const formatHousingOwnerApi = (
  housingOwner: HousingOwnerApi
): HousingOwnerDBO => ({
  owner_id: housingOwner.id,
  housing_id: housingOwner.housingId,
  housing_geo_code: housingOwner.housingGeoCode,
  rank: housingOwner.rank,
  start_date: housingOwner.startDate,
  end_date: housingOwner.endDate,
  origin: housingOwner.origin,
  idprocpte: housingOwner.idprocpte,
  idprodroit: housingOwner.idprodroit,
  locprop_source:
    typeof housingOwner.locprop === 'number'
      ? String(housingOwner.locprop)
      : null,
  property_right: housingOwner.propertyRight
});

export const formatHousingOwnersApi = (
  housing: HousingRecordApi,
  owners: OwnerApi[],
  origin?: string
): HousingOwnerDBO[] =>
  owners.map((owner, i) => ({
    owner_id: owner.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode,
    rank: (i + 1) as OwnerRank,
    start_date: new Date(),
    origin,
    property_right: null
  }));

const housingOwnerRepository = {
  findByOwner,
  insert,
  saveMany
};

export default housingOwnerRepository;
