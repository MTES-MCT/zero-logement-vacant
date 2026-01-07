import type { RelativeLocation } from '@zerologementvacant/models';
import { OwnerRank, PropertyRight } from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { HousingRecordApi } from '~/models/HousingApi';
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
      .modify((query) => {
        // Filter by geoCodes (user perimeter filtering)
        // Note: geoCodes is an array when a restriction applies
        //   - non-empty array: filter to housings in these geoCodes
        //   - empty array: user should see NO housings (intersection with perimeter is empty)
        if (options?.geoCodes !== undefined) {
          if (options.geoCodes.length === 0) {
            // Empty geoCodes means no access - return no results
            query.whereRaw('1 = 0');
          } else {
            query.whereIn(
              `${housingOwnersTable}.housing_geo_code`,
              options.geoCodes as string[]
            );
          }
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

async function saveMany(
  housingOwners: ReadonlyArray<Omit<HousingOwnerApi, keyof OwnerApi>>
): Promise<void> {
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
  start_date: Date | null;
  end_date: Date | null;
  origin: string | null;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop_source: string | null;
  locprop_relative_ban: number | null;
  locprop_distance_ban: number | null;
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
    origin: ownerHousing.origin,
    idprocpte: ownerHousing.idprocpte,
    idprodroit: ownerHousing.idprodroit,
    locprop:
      ownerHousing.locprop_source !== null
        ? Number(ownerHousing.locprop_source)
        : null,
    propertyRight: ownerHousing.property_right,
    relativeLocation: ownerHousing.locprop_relative_ban
      ? fromRelativeLocationDBO(ownerHousing.locprop_relative_ban)
      : null,
    absoluteDistance: ownerHousing.locprop_distance_ban
  };
  const housing: HousingRecordApi = parseHousingRecordApi(ownerHousing);

  return {
    ...housing,
    ...owner
  };
}
export const formatHousingOwnerApi = (
  housingOwner: Omit<HousingOwnerApi, keyof OwnerApi>
): HousingOwnerDBO => ({
  owner_id: housingOwner.ownerId,
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
  locprop_relative_ban: toRelativeLocationDBO(housingOwner.relativeLocation),
  locprop_distance_ban: housingOwner.absoluteDistance,
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
    idprocpte: null,
    idprodroit: null,
    rank: (i + 1) as OwnerRank,
    start_date: new Date(),
    end_date: null,
    origin: origin ?? null,
    locprop_source: null,
    locprop_relative_ban: null,
    locprop_distance_ban: null,
    property_right: null
  }));

export const fromRelativeLocationDBO = (
  loc: number | null
): RelativeLocation | null =>
  match(loc)
    .returnType<RelativeLocation | null>()
    .with(1, () => 'same-commune')
    .with(2, () => 'same-department')
    .with(3, () => 'same-region')
    .with(4, () => 'metropolitan')
    .with(5, () => 'overseas')
    .with(null, () => null)
    .otherwise(() => 'other');

export const toRelativeLocationDBO = (
  loc: RelativeLocation | null
): number | null =>
  match(loc)
    .returnType<number | null>()
    .with('same-commune', () => 1)
    .with('same-department', () => 2)
    .with('same-region', () => 3)
    .with('metropolitan', () => 4)
    .with('overseas', () => 5)
    .with('other', () => 6)
    .with(null, () => null)
    .exhaustive();

const housingOwnerRepository = {
  findByOwner,
  insert,
  saveMany
};

export default housingOwnerRepository;
