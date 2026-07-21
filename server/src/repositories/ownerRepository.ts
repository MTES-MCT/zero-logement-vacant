import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import {
  AddressKinds,
  OwnerEntity,
  OwnerRank,
  PropertyRight
} from '@zerologementvacant/models';
import { snakeToCamel } from 'effect/String';
import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';
import _ from 'lodash';
import { match, Pattern } from 'ts-pattern';

import db, { ConflictOptions } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { PaginatedResultApi } from '~/models/PaginatedResultApi';
import {
  isPaginationEnabled,
  type PaginationApi
} from '~/models/PaginationApi';

import { AddressDBO, parseAddressApi } from './banAddressesRepository';
import {
  fromRelativeLocationDBO,
  HousingOwnerDBO,
  housingOwnersTable
} from './housingOwnerRepository';
import { housingTable } from './housingRepository';

const logger = createLogger('ownerRepository');

export const ownerTable = 'owners';
export const Owners = (transaction = db) => transaction<OwnerDBO>(ownerTable);

export interface OwnerRecordDBO {
  id: string;
  idpersonne: string | null;
  full_name: string;
  birth_date: Date | string | null;
  administrator: string | null;
  siren: string | null;
  address_dgfip: string[] | null;
  additional_address: string | null;
  email: string | null;
  phone: string | null;
  data_source: string | null;
  kind_class: string | null;
  entity: OwnerEntity | null;
  username: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  is_multi_owner: boolean | null;
}

export interface OwnerDBO extends OwnerRecordDBO {
  ban?: AddressDBO;
  /**
   * @deprecated See {@link ban}
   */
  postal_code?: string;
  /**
   * @deprecated See {@link ban}
   */
  house_number?: string;
  /**
   * @deprecated See {@link ban}
   */
  street?: string;
  /**
   * @deprecated See {@link ban}
   */
  city?: string;
  /**
   * @deprecated See {@link ban}
   */
  score?: number;
}

interface OwnerFilters {
  fullName?: string;
  /**
   * Pass a string or an array of strings to filter by idpersonne.
   * Pass `true` to filter owners that have an idpersonne (not null).
   */
  idpersonne?: string | string[] | boolean;
  campaignId?: string;
  groupId?: string;
}

interface FindOptions {
  search?: string;
  filters?: OwnerFilters;
  groupBy?: Array<keyof OwnerDBO>;
  includes?: OwnerInclude[];
  pagination?: PaginationApi;
}

async function find(opts?: FindOptions): Promise<OwnerApi[]> {
  logger.debug('Finding owners...', opts);

  let query: any = kysely.selectFrom('owners').selectAll('owners');
  query = applyOwnerIncludes(query, opts?.includes ?? []);
  query = applyOwnerFilters(query, opts?.filters);
  query = applyOwnerSearch(query, opts?.search ?? null);
  // Reproduce where<OwnerFilters>(['fullName']): add equality filter when present
  if (opts?.filters?.fullName !== undefined) {
    query = query.where('owners.fullName', '=', opts.filters.fullName);
  }
  // paginate() defaulted to { page: 1, perPage: 50 } when no pagination was
  // provided, so unpaginated find() calls were still capped at 50 rows.
  const pagination: PaginationApi = opts?.pagination ?? {
    paginate: true,
    page: 1,
    perPage: 50
  };
  if (isPaginationEnabled(pagination)) {
    query = query
      .limit(pagination.perPage)
      .offset((pagination.page - 1) * pagination.perPage);
  }
  query = query.orderBy('full_name');

  const rows: OwnerRow[] = await query.execute();
  logger.debug(`Found ${rows.length} owners`, opts);
  return rows.map(parseOwnerRow);
}

async function count(opts?: FindOptions): Promise<number> {
  logger.debug('Counting owners...', opts);

  let query: any = kysely
    .selectFrom('owners')
    .select(sql`count(id)`.as('count'));
  query = applyOwnerFilters(query, opts?.filters);
  query = applyOwnerSearch(query, opts?.search ?? null);
  if (opts?.filters?.fullName !== undefined) {
    query = query.where('owners.fullName', '=', opts.filters.fullName);
  }

  const result = await query.executeTakeFirst();
  const total = Number(result?.count ?? 0);
  logger.debug(`Counted ${total} owners`, opts);
  return total;
}

const get = async (ownerId: string): Promise<OwnerApi | null> => {
  let query: any = kysely.selectFrom('owners').selectAll('owners');
  query = applyOwnerIncludes(query, ['banAddress']);
  query = query.where('owners.id', '=', ownerId);

  const row: OwnerRow | undefined = await query.executeTakeFirst();
  return row ? parseOwnerRow(row) : null;
};

type StreamOptions = FindOptions;

function stream(
  options?: StreamOptions
): ReadableStream<OwnerApi & { housings?: ReadonlyArray<HousingApi> }> {
  let query: any = kysely.selectFrom('owners').selectAll('owners');
  query = applyOwnerIncludes(query, options?.includes ?? []);
  query = applyOwnerFilters(query, options?.filters);
  // Reproduce groupBy<OwnerDBO>(options?.groupBy): DISTINCT ON when columns given
  if (options?.groupBy?.length) {
    query = query.distinctOn(options.groupBy);
  }
  query = query.orderBy('full_name');

  const rows = query.stream();
  const mapped = (async function* () {
    for await (const row of rows) {
      yield parseHousingOwnerRow(row as HousingOwnerRow);
    }
  })();
  return Readable.toWeb(Readable.from(mapped)) as ReadableStream<
    OwnerApi & { housings?: ReadonlyArray<HousingApi> }
  >;
}

interface FindOneOptions extends Partial<
  Pick<OwnerApi, 'id' | 'idpersonne' | 'fullName' | 'rawAddress'>
> {
  birthDate?: Date;
}

async function findOne(opts: FindOneOptions): Promise<OwnerApi | null> {
  let query: any = kysely.selectFrom('owners').selectAll('owners');
  // Reproduce compact({...}).where(...) — only add conditions for defined values
  if (opts.idpersonne !== undefined) {
    query = query.where('owners.idpersonne', '=', opts.idpersonne);
  }
  if (opts.fullName !== undefined) {
    query = query.where('owners.fullName', '=', opts.fullName);
  }
  if (opts.rawAddress !== undefined) {
    // address_dgfip is text[]; a plain `where(col, '=', array)` makes Kysely emit
    // a row constructor (text[] = record). Bind the array as a single parameter so
    // node-postgres serialises it to a Postgres array literal instead.
    query = query.where(sql`address_dgfip = ${opts.rawAddress}`);
  }
  if (opts.birthDate !== undefined) {
    query = query.where('owners.birthDate', '=', opts.birthDate);
  }

  const row: OwnerRow | undefined = await query.executeTakeFirst();
  return row ? parseOwnerRow(row) : null;
}

function applyOwnerSearch(query: any, searchQuery: string | null): any {
  if (!searchQuery) {
    return query;
  }
  const tsQuery = searchQuery
    .trim()
    .split(/\s+/)
    .map((term) => `${term}:*`) // permet le préfixe (ex: dupont:* = dupont, dupontet...)
    .join(' & '); // opérateur logique AND entre les mots
  return query.where(sql`full_name_fts @@ to_tsquery('simple', ${tsQuery})`);
}

/**
 * @deprecated Use {@link find} with filters instead
 * @param q
 * @param page
 * @param perPage
 * @returns
 */
const searchOwners = async (
  q: string,
  page?: number,
  perPage?: number
): Promise<PaginatedResultApi<OwnerApi>> => {
  const tsQuery = q
    .trim()
    .split(/\s+/)
    .map((term) => `${term}:*`) // permet le préfixe (ex: dupont:* = dupont, dupontet...)
    .join(' & '); // opérateur logique AND entre les mots

  const filteredCount = await (
    kysely.selectFrom('owners').select(sql`count(id)`.as('count')) as any
  )
    .where(sql`full_name_fts @@ to_tsquery('simple', ${tsQuery})`)
    .executeTakeFirst()
    .then((row: any) => Number(row?.count));

  const totalCount = await kysely
    .selectFrom('owners')
    .select(sql`count(id)`.as('count'))
    .executeTakeFirst()
    .then((row) => Number(row?.count));

  let filterQuery: any = (
    kysely.selectFrom('owners').selectAll('owners') as any
  )
    .where(sql`full_name_fts @@ to_tsquery('simple', ${tsQuery})`)
    .orderBy('full_name');
  if (page && perPage) {
    filterQuery = filterQuery.offset((page - 1) * perPage).limit(perPage);
  }
  const results: OwnerRow[] = await filterQuery.execute();

  logger.debug('filteredCount', filteredCount);

  return <PaginatedResultApi<OwnerApi>>{
    entities: results.map(parseOwnerRow),
    totalCount,
    filteredCount,
    page,
    perPage
  };
};

const findByHousing = async (
  housing: HousingApi
): Promise<HousingOwnerApi[]> => {
  let query: any = kysely
    .selectFrom('owners')
    .selectAll('owners')
    .innerJoin('ownersHousing', 'owners.id', 'ownersHousing.ownerId')
    .selectAll('ownersHousing')
    .where('ownersHousing.housingId', '=', housing.id)
    .where('ownersHousing.housingGeoCode', '=', housing.geoCode);
  query = applyOwnerIncludes(query, ['banAddress']);
  query = query.orderBy('end_date', 'desc').orderBy('rank');

  const rows: HousingOwnerRow[] = await query.execute();
  return rows.map(parseHousingOwnerRow);
};

const insert = async (draftOwnerApi: OwnerApi): Promise<OwnerApi> => {
  logger.info('Insert draftOwnerApi');
  return Owners()
    .insert({
      address_dgfip: draftOwnerApi.rawAddress,
      full_name: draftOwnerApi.fullName,
      birth_date: draftOwnerApi.birthDate,
      email: draftOwnerApi.email,
      phone: draftOwnerApi.phone
    })
    .returning('*')
    .then((_) => parseOwnerApi(_[0]));
};

type BetterSaveOptions = ConflictOptions<OwnerDBO>;

/**
 * @todo Rename this to `save` when {@link save} and {@link saveMany} get removed
 * @param owner
 * @param opts
 */
async function betterSave(
  owner: OwnerApi,
  opts: BetterSaveOptions
): Promise<void> {
  logger.debug(`Saving owner...`, { owner });
  await kysely
    .insertInto('owners')
    .values(toOwnerInsert(owner))
    .onConflict(kyselyOwnerConflict(opts))
    .execute();
}

async function betterSaveMany(
  owners: ReadonlyArray<OwnerApi>,
  opts: BetterSaveOptions
): Promise<void> {
  logger.debug(`Saving ${owners.length} owners...`);
  if (owners.length === 0) {
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('owners')
      .values(owners.map(toOwnerInsert))
      .onConflict(kyselyOwnerConflict(opts))
      .execute();
  });
}

// Camel-case Insertable mirror of formatOwnerApi for the Kysely write path.
function toOwnerInsert(owner: OwnerApi): Insertable<DB['owners']> {
  return {
    id: owner.id,
    idpersonne: owner.idpersonne ?? null,
    fullName: owner.fullName,
    birthDate: owner.birthDate,
    administrator: owner.administrator ?? null,
    siren: owner.siren ?? null,
    addressDgfip: owner.rawAddress,
    additionalAddress: owner.additionalAddress ?? null,
    email: owner.email ?? null,
    phone: owner.phone ?? null,
    dataSource: owner.dataSource ?? null,
    kindClass: owner.kind ?? null,
    entity: owner.entity,
    username: owner.username ?? null,
    createdAt: owner.createdAt ? new Date(owner.createdAt) : null,
    updatedAt: owner.updatedAt ? new Date(owner.updatedAt) : null,
    isMultiOwner: null
  };
}

// Reproduces the Knex `onConflict(opts)` helper for Kysely. Callers pass
// snake_case column names (keyof OwnerDBO); map them to the camelCase DB keys.
function kyselyOwnerConflict(opts: BetterSaveOptions) {
  if (opts.onConflict.length === 0) {
    throw new Error('onConflict must have at least one column');
  }
  const columns = (opts.onConflict as ReadonlyArray<string>).map((column) =>
    snakeToCamel(column)
  );
  return (oc: any) => {
    const builder = oc.columns(columns);
    if (opts.merge === false) {
      return builder.doNothing();
    }
    const mergeColumns =
      opts.merge === true
        ? (Object.keys(toOwnerInsert({} as OwnerApi)) as string[]).filter(
            (column) => !columns.includes(column)
          )
        : (opts.merge as ReadonlyArray<string>).map((column) =>
            snakeToCamel(column)
          );
    return builder.doUpdateSet((eb: any) =>
      Object.fromEntries(
        mergeColumns.map((column) => [column, eb.ref(`excluded.${column}`)])
      )
    );
  };
}

interface SaveOptions {
  /**
   * @default 'ignore'
   */
  onConflict?: 'merge' | 'ignore';
}

/**
 * @deprecated Use {@link betterSave} instead
 * @param owner
 * @param opts
 */
async function save(owner: OwnerApi, opts?: SaveOptions): Promise<void> {
  return saveMany([owner], opts);
}

/**
 * @deprecated Use {@link betterSave} instead
 * @param owners
 * @param opts
 */
async function saveMany(owners: OwnerApi[], opts?: SaveOptions): Promise<void> {
  logger.debug(`Saving ${owners.length} owners...`);

  const ownersWithoutBirthdate = owners
    .filter((owner) => !owner.birthDate)
    .map(formatOwnerApi);
  const ownersWithBirthdate = owners
    .filter((owner) => !!owner.birthDate)
    .map(formatOwnerApi);

  const onConflict = opts?.onConflict ?? 'merge';

  await db.transaction(async (transaction) => {
    const queries = [];

    if (ownersWithBirthdate.length > 0) {
      queries.push(
        transaction<OwnerDBO>(ownerTable)
          .insert(ownersWithBirthdate)
          .modify((builder) => {
            if (onConflict === 'merge') {
              return builder
                .onConflict(['full_name', 'address_dgfip', 'birth_date'])
                .merge(['administrator', 'kind_class']);
            }
            return builder
              .onConflict(['full_name', 'address_dgfip', 'birth_date'])
              .ignore();
          })
      );
    }

    if (ownersWithoutBirthdate.length > 0) {
      queries.push(
        transaction<OwnerDBO>(ownerTable)
          .insert(ownersWithoutBirthdate)
          .modify((builder) => {
            if (onConflict === 'merge') {
              return builder
                .onConflict(
                  db.raw(
                    '(full_name, address_dgfip, (birth_date IS NULL)) where birth_date is null'
                  )
                )
                .merge(['administrator', 'kind_class']);
            }
            return builder
              .onConflict(
                db.raw(
                  '(full_name, address_dgfip, (birth_date IS NULL)) where birth_date is null'
                )
              )
              .ignore();
          })
      );
    }

    await Promise.all(queries);
  });
}

const update = async (ownerApi: OwnerApi): Promise<OwnerApi> => {
  try {
    return db(ownerTable)
      .where('id', ownerApi.id)
      .update({
        address_dgfip: ownerApi.rawAddress,
        full_name: ownerApi.fullName,
        birth_date: ownerApi.birthDate,
        email: ownerApi.email ?? null,
        phone: ownerApi.phone ?? null,
        additional_address: ownerApi.additionalAddress ?? null
      })
      .returning('*')
      .then((_) => parseOwnerApi(_[0]));
  } catch (err) {
    console.error('Updating owner failed', err, ownerApi);
    throw new Error('Updating owner failed');
  }
};

const insertHousingOwners = async (
  housingOwners: HousingOwnerApi[]
): Promise<number> => {
  try {
    return db(housingOwnersTable)
      .insert(
        housingOwners.map((ho) => ({
          owner_id: ho.id,
          housing_id: ho.housingId,
          housing_geo_code: ho.housingGeoCode,
          rank: ho.rank,
          start_date: ho.startDate,
          end_date: ho.endDate,
          origin: ho.origin
        }))
      )
      .returning('*')
      .then((_) => _.length);
  } catch (err) {
    console.error('Inserting housing owners failed', err);
    throw new Error('Inserting housing owners failed');
  }
};

const deleteHousingOwners = async (
  housingId: string,
  ownerIds: string[]
): Promise<number> => {
  try {
    return db(housingOwnersTable)
      .delete()
      .whereIn('owner_id', ownerIds)
      .andWhere('housing_id', housingId);
  } catch (err) {
    console.error('Removing owners from housing failed', err, ownerIds);
    throw new Error('Removing owners from housing failed');
  }
};

const updateAddressList = async (
  ownerAdresses: { addressId: string; addressApi: AddressApi }[]
): Promise<HousingApi[]> => {
  try {
    if (ownerAdresses.filter((oa) => oa.addressId).length) {
      const update =
        'UPDATE owners as o SET ' +
        'postal_code = c.postal_code, house_number = c.house_number, street = c.street, city = c.city ' +
        'FROM (values' +
        ownerAdresses
          .filter((oa) => oa.addressId)
          .map(
            (ha) =>
              `('${ha.addressId}', '${ha.addressApi.postalCode}', '${
                ha.addressApi.houseNumber ?? ''
              }', '${escapeValue(ha.addressApi.street)}', '${escapeValue(
                ha.addressApi.city
              )}')`
          ) +
        ') as c(id, postal_code, house_number, street, city)' +
        ' WHERE o.id::text = c.id';

      return db.raw(update);
    } else {
      return Promise.resolve([]);
    }
  } catch (err) {
    console.error('Listing housing failed', err);
    throw new Error('Listing housing failed');
  }
};

const escapeValue = (value?: string) => {
  return value ? value.replace(/'/g, "''") : '';
};

type OwnerInclude = 'banAddress' | 'housings';

// Row type returned by Kysely for owner queries.
// Top-level columns come back camelCase (CamelCasePlugin); the `ban` JSON blob
// stays snake_case (maintainNestedObjectKeys: true), matching AddressDBO.
type OwnerRow = Selectable<DB['owners']> & {
  ban?: AddressDBO | null;
};

// ---------------------------------------------------------------------------
// Row parsers for the Kysely read path
// ---------------------------------------------------------------------------

/**
 * Maps a camelCase Kysely owner row to OwnerApi.
 * Field-for-field mirror of parseOwnerApi (which reads from snake_case OwnerDBO).
 * The `ban` JSON blob stays snake_case (maintainNestedObjectKeys: true).
 */
export const parseOwnerRow = (row: OwnerRow): OwnerApi => {
  const birthDate = match(row.birthDate as Date | string | null | undefined)
    .returnType<string | null>()
    .with(Pattern.string, (value) => value.substring(0, 'yyyy-mm-dd'.length))
    .with(Pattern.instanceOf(Date), (value) =>
      value.toJSON().substring(0, 'yyyy-mm-dd'.length)
    )
    .otherwise((value) => value ?? null);
  return {
    id: row.id,
    idpersonne: row.idpersonne ?? null,
    rawAddress: row.addressDgfip ?? null,
    fullName: row.fullName,
    administrator: row.administrator ?? null,
    birthDate: birthDate,
    email: row.email ?? null,
    phone: row.phone ?? null,
    kind: row.kindClass ?? null,
    siren: row.siren ?? null,
    banAddress: row.ban ? parseAddressApi(row.ban) : null,
    additionalAddress: row.additionalAddress ?? null,
    entity: (row.entity as OwnerEntity | null) ?? null,
    username: row.username ?? null,
    createdAt: row.createdAt
      ? new Date(row.createdAt as Date | string).toJSON()
      : null,
    updatedAt: row.updatedAt
      ? new Date(row.updatedAt as Date | string).toJSON()
      : null
  };
};

/**
 * Maps a camelCase Kysely owner+housingOwner row to HousingOwnerApi.
 * Field-for-field mirror of parseHousingOwnerApi (which reads snake_case).
 * Used by stream (which joins ownersHousing) and findByHousing.
 */
type HousingOwnerRow = OwnerRow & Selectable<DB['ownersHousing']>;

const parseHousingOwnerRow = (row: HousingOwnerRow): HousingOwnerApi => ({
  ...parseOwnerRow(row),
  ownerId: row.id,
  housingId: row.housingId,
  housingGeoCode: row.housingGeoCode,
  rank: row.rank as OwnerRank,
  // DATE columns come back as "YYYY-MM-DD" strings (global pg DATE parser); the
  // API type still declares Date, matching the pre-migration passthrough.
  startDate: row.startDate as unknown as Date | null,
  endDate: row.endDate as unknown as Date | null,
  origin: row.origin,
  idprocpte: row.idprocpte,
  idprodroit: row.idprodroit,
  locprop:
    typeof row.locpropSource === 'string' ? Number(row.locpropSource) : null,
  relativeLocation: fromRelativeLocationDBO(row.locpropRelativeBan),
  absoluteDistance: row.locpropDistanceBan,
  propertyRight: row.propertyRight as PropertyRight | null
});

// ---------------------------------------------------------------------------
// Kysely include / filter / search helpers
// ---------------------------------------------------------------------------

function applyOwnerIncludes(query: any, includes: OwnerInclude[]): any {
  const unique = [...new Set(includes)];
  for (const inc of unique) {
    if (inc === 'banAddress') {
      query = query
        .leftJoin('banAddresses as ban', (join: any) =>
          join
            .onRef('owners.id', '=', 'ban.refId')
            .on('ban.addressKind', '=', AddressKinds.Owner)
        )
        .select(sql`to_json(ban.*)`.as('ban'));
    } else if (inc === 'housings') {
      query = query.select(
        sql`(
            SELECT json_agg(${sql.raw(housingTable)}.*)
            FROM ${sql.raw(housingOwnersTable)}
            JOIN ${sql.raw(housingTable)}
              ON ${sql.raw(housingOwnersTable)}.housing_geo_code = ${sql.raw(housingTable)}.geo_code
              AND ${sql.raw(housingOwnersTable)}.housing_id = ${sql.raw(housingTable)}.id
            WHERE owners.id = ${sql.raw(housingOwnersTable)}.owner_id
          )`.as('housings')
      );
    }
  }
  return query;
}

function applyOwnerFilters(query: any, filters?: OwnerFilters): any {
  if (!filters) return query;

  if (filters.idpersonne !== undefined) {
    query = match(filters.idpersonne)
      .with(true, () => query.where('owners.idpersonne', 'is not', null))
      .with(false, () => query.where('owners.idpersonne', 'is', null))
      .with(Pattern.string, (value) =>
        query.where('owners.idpersonne', '=', value)
      )
      .with(Pattern.array(Pattern.string), (value) =>
        value.length > 0 ? query.where('owners.idpersonne', 'in', value) : query
      )
      .exhaustive();
  }

  if (filters.campaignId) {
    query = query
      .innerJoin('ownersHousing', 'owners.id', 'ownersHousing.ownerId')
      .innerJoin('fastHousing', (join: any) =>
        join
          .onRef('fastHousing.id', '=', 'ownersHousing.housingId')
          .onRef('fastHousing.geoCode', '=', 'ownersHousing.housingGeoCode')
          .on('ownersHousing.rank', '=', 1)
      )
      .innerJoin('campaignsHousing', (join: any) =>
        join
          .onRef('fastHousing.id', '=', 'campaignsHousing.housingId')
          .onRef('fastHousing.geoCode', '=', 'campaignsHousing.housingGeoCode')
      )
      .where('campaignsHousing.campaignId', '=', filters.campaignId);
  }

  if (filters.groupId) {
    query = query
      .innerJoin('ownersHousing', 'owners.id', 'ownersHousing.ownerId')
      .innerJoin('fastHousing', (join: any) =>
        join
          .onRef('fastHousing.id', '=', 'ownersHousing.housingId')
          .onRef('fastHousing.geoCode', '=', 'ownersHousing.housingGeoCode')
          .on('ownersHousing.rank', '=', 1)
      )
      .innerJoin('groupsHousing', (join: any) =>
        join
          .onRef('fastHousing.id', '=', 'groupsHousing.housingId')
          .onRef('fastHousing.geoCode', '=', 'groupsHousing.housingGeoCode')
      )
      .where('groupsHousing.groupId', '=', filters.groupId);
  }

  return query;
}

export const parseOwnerApi = (owner: OwnerDBO): OwnerApi => {
  const birthDate = match(owner.birth_date)
    .returnType<string | null>()
    .with(Pattern.string, (value) => value.substring(0, 'yyyy-mm-dd'.length))
    .with(Pattern.instanceOf(Date), (value) =>
      value.toJSON().substring(0, 'yyyy-mm-dd'.length)
    )
    .otherwise((value) => value);
  return {
    id: owner.id,
    idpersonne: owner.idpersonne,
    rawAddress: owner.address_dgfip,
    fullName: owner.full_name,
    administrator: owner.administrator ?? null,
    birthDate: birthDate,
    email: owner.email ?? null,
    phone: owner.phone ?? null,
    kind: owner.kind_class,
    siren: owner.siren ?? null,
    banAddress: owner.ban ? parseAddressApi(owner.ban) : null,
    additionalAddress: owner.additional_address ?? null,
    entity: owner.entity,
    username: owner.username ?? null,
    createdAt: owner.created_at ? new Date(owner.created_at).toJSON() : null,
    updatedAt: owner.updated_at ? new Date(owner.updated_at).toJSON() : null
  };
};

export const parseHousingOwnerApi = (
  housingOwner: OwnerDBO & HousingOwnerDBO
): HousingOwnerApi => ({
  ...parseOwnerApi(housingOwner),
  ownerId: housingOwner.id,
  housingId: housingOwner.housing_id,
  housingGeoCode: housingOwner.housing_geo_code,
  rank: housingOwner.rank,
  startDate: housingOwner.start_date,
  endDate: housingOwner.end_date,
  origin: housingOwner.origin,
  idprocpte: housingOwner.idprocpte,
  idprodroit: housingOwner.idprodroit,
  locprop:
    typeof housingOwner.locprop_source === 'string'
      ? Number(housingOwner.locprop_source)
      : null,
  relativeLocation: fromRelativeLocationDBO(housingOwner.locprop_relative_ban),
  absoluteDistance: housingOwner.locprop_distance_ban,
  propertyRight: housingOwner.property_right
});

export const formatOwnerApi = (owner: OwnerApi): OwnerRecordDBO => ({
  id: owner.id,
  idpersonne: owner.idpersonne ?? null,
  full_name: owner.fullName,
  birth_date: owner.birthDate,
  administrator: owner.administrator ?? null,
  siren: owner.siren ?? null,
  address_dgfip: owner.rawAddress,
  additional_address: owner.additionalAddress ?? null,
  email: owner.email ?? null,
  phone: owner.phone ?? null,
  data_source: owner.dataSource ?? null,
  kind_class: owner.kind ?? null,
  entity: owner.entity,
  username: owner.username ?? null,
  created_at: owner.createdAt ? new Date(owner.createdAt) : null,
  updated_at: owner.updatedAt ? new Date(owner.updatedAt) : null,
  is_multi_owner: null
});

// pg encodes parameter count as uint16 (max 65 535). A whereIn with more IDs
// than this overflows the wire-protocol bind message. Chunk well below that.
const MULTI_OWNER_BATCH_SIZE = 10_000;

async function refreshMultiOwnerFlags(
  ownerIds: ReadonlyArray<string>
): Promise<void> {
  if (!ownerIds.length) return;
  for (let i = 0; i < ownerIds.length; i += MULTI_OWNER_BATCH_SIZE) {
    const chunk = ownerIds.slice(i, i + MULTI_OWNER_BATCH_SIZE);
    await withinKyselyTransaction(async (trx) => {
      await trx
        .updateTable('owners')
        .set({
          isMultiOwner: sql<boolean>`(SELECT COUNT(*) > 1 FROM ${sql.raw(housingOwnersTable)} WHERE owner_id = owners.id AND rank = 1)`
        })
        .where('id', 'in', chunk)
        .execute();
    });
  }
}

export { refreshMultiOwnerFlags };

export default {
  find,
  count,
  stream,
  get,
  findOne,
  searchOwners,
  findByHousing,
  insert,
  betterSave,
  betterSaveMany,
  save,
  saveMany,
  update,
  updateAddressList,
  deleteHousingOwners,
  insertHousingOwners,
  refreshMultiOwnerFlags
};
