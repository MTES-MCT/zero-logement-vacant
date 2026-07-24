import type {
  RelativeLocation,
  RelativeLocationFilter
} from '@zerologementvacant/models';
import { OwnerRank, PropertyRight } from '@zerologementvacant/models';
import type { Insertable, Selectable } from 'kysely';
import { match } from 'ts-pattern';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import { HousingRecordApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  parseHousingRecordApi,
  parseHousingRecordRow,
  type HousingRecordDBO,
  type HousingRecordRow
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

  let query: any = kysely
    .selectFrom('ownersHousing')
    .innerJoin('fastHousing', (join) =>
      join
        .onRef('ownersHousing.housingId', '=', 'fastHousing.id')
        .onRef('ownersHousing.housingGeoCode', '=', 'fastHousing.geoCode')
    )
    .selectAll('ownersHousing')
    .selectAll('fastHousing')
    .where('ownersHousing.ownerId', '=', owner.id);

  // Filter by geoCodes (user perimeter filtering)
  //   - non-empty array: filter to housings in these geoCodes
  //   - empty array: user should see NO housings (HandleEmptyInListsPlugin turns
  //     the empty `in ()` into a non-contingent false, matching the old `1 = 0`)
  if (options?.geoCodes !== undefined) {
    query = query.where(
      'ownersHousing.housingGeoCode',
      'in',
      options.geoCodes as string[]
    );
  }

  const rows: ReadonlyArray<
    Selectable<DB['ownersHousing']> & HousingRecordRow
  > = await query.execute();

  return rows.map(parseOwnerHousingRow);
}

async function insert(housingOwner: HousingOwnerApi): Promise<void> {
  logger.debug('Saving housing owner...', {
    housingOwner
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('ownersHousing')
      .values(toHousingOwnerInsert(housingOwner))
      .onConflict((oc) => oc.doNothing())
      .execute();
  });
  logger.debug('Saved housing owner.');
}

// Camel-case Insertable mirror of formatHousingOwnerApi. start_date/end_date are
// `date` columns typed as string by kysely-codegen; the API carries Date values,
// so they are passed through unchanged (pg serializes them exactly as Knex did).
function toHousingOwnerInsert(
  housingOwner: Omit<HousingOwnerApi, keyof OwnerApi>
): Insertable<DB['ownersHousing']> {
  return {
    ownerId: housingOwner.ownerId,
    housingId: housingOwner.housingId,
    housingGeoCode: housingOwner.housingGeoCode,
    rank: housingOwner.rank,
    startDate: housingOwner.startDate as unknown as string | null,
    endDate: housingOwner.endDate as unknown as string | null,
    origin: housingOwner.origin,
    idprocpte: housingOwner.idprocpte,
    idprodroit: housingOwner.idprodroit,
    locpropSource:
      typeof housingOwner.locprop === 'number'
        ? String(housingOwner.locprop)
        : null,
    locpropRelativeBan: toRelativeLocationDBO(housingOwner.relativeLocation),
    locpropDistanceBan: housingOwner.absoluteDistance,
    propertyRight: housingOwner.propertyRight
  };
}

async function saveMany(
  housingOwners: ReadonlyArray<Omit<HousingOwnerApi, keyof OwnerApi>>
): Promise<ReadonlyArray<string>> {
  if (!housingOwners.length) return [];

  housingOwners.forEach((housingOwner) => {
    logger.debug('Saving housing owner...', { housingOwner });
  });

  const housingGeoCode = housingOwners[0].housingGeoCode;
  const housingId = housingOwners[0].housingId;
  const newOwnerIds = housingOwners.map((ho) => ho.ownerId);
  let affectedOwnerIds: string[] = newOwnerIds;

  // Remove owners before inserting them back
  await withinKyselyTransaction(async (trx) => {
    const existing = await trx
      .selectFrom('ownersHousing')
      .where('housingGeoCode', '=', housingGeoCode)
      .where('housingId', '=', housingId)
      .select('ownerId')
      .execute();
    affectedOwnerIds = [
      ...new Set([...existing.map((row) => row.ownerId), ...newOwnerIds])
    ];
    await trx
      .deleteFrom('ownersHousing')
      .where('housingGeoCode', '=', housingGeoCode)
      .where('housingId', '=', housingId)
      .execute();
    await trx
      .insertInto('ownersHousing')
      .values(housingOwners.map(toHousingOwnerInsert))
      .execute();
  });

  logger.debug(`Saved ${housingOwners.length} housing owners.`);
  return affectedOwnerIds;
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

/**
 * Camel-case Kysely mirror of {@link parseOwnerHousingApi}. Reads a joined
 * owners_housing + fast_housing row (camelCase columns; fast_housing supplies
 * the housing id/geoCode) and returns the owner-housing link merged with the
 * housing record.
 */
export function parseOwnerHousingRow(
  row: Selectable<DB['ownersHousing']> & HousingRecordRow
): Omit<HousingOwnerApi, keyof OwnerApi> & HousingRecordApi {
  const owner: Omit<HousingOwnerApi, keyof OwnerApi> = {
    housingGeoCode: row.geoCode,
    housingId: row.id,
    ownerId: row.ownerId,
    rank: row.rank as OwnerRank,
    // DATE columns come back as "YYYY-MM-DD" strings; the API type declares Date,
    // matching the pre-migration passthrough.
    startDate: row.startDate as unknown as Date | null,
    endDate: row.endDate as unknown as Date | null,
    origin: row.origin,
    idprocpte: row.idprocpte,
    idprodroit: row.idprodroit,
    locprop: row.locpropSource !== null ? Number(row.locpropSource) : null,
    propertyRight: row.propertyRight as PropertyRight | null,
    relativeLocation: row.locpropRelativeBan
      ? fromRelativeLocationDBO(row.locpropRelativeBan)
      : null,
    absoluteDistance: row.locpropDistanceBan
  };
  const housing: HousingRecordApi = parseHousingRecordRow(row);

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
    .with(0, () => 'same-address')
    .with(1, () => 'same-commune')
    .with(2, () => 'same-department')
    .with(3, () => 'same-region')
    .with(4, () => 'metropolitan')
    .with(5, () => 'overseas')
    .with(6, () => 'foreign-country')
    .with(7, () => 'other')
    .otherwise(() => null);

export const toRelativeLocationDBO = (
  loc: RelativeLocation | null
): number | null =>
  match(loc)
    .returnType<number | null>()
    .with('same-address', () => 0)
    .with('same-commune', () => 1)
    .with('same-department', () => 2)
    .with('same-region', () => 3)
    .with('metropolitan', () => 4)
    .with('overseas', () => 5)
    .with('foreign-country', () => 6)
    .with('other', () => 7)
    .with(null, () => null)
    .exhaustive();

/**
 * Maps a RelativeLocationFilter to its corresponding DBO numeric values.
 * 'other-region' expands to both 'metropolitan' (4) and 'overseas' (5).
 */
export const relativeLocationFilterToDBO = (
  filter: RelativeLocationFilter
): number[] =>
  match(filter)
    .returnType<number[]>()
    .with('same-address', () => [0])
    .with('same-commune', () => [1])
    .with('same-department', () => [2])
    .with('same-region', () => [3])
    .with('other-region', () => [4, 5])
    .with('foreign-country', () => [6])
    .with('other', () => [7])
    .exhaustive();

const housingOwnerRepository = {
  findByOwner,
  insert,
  saveMany
};

export default housingOwnerRepository;
