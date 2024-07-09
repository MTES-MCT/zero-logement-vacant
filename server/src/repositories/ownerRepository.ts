import highland from 'highland';
import { Knex } from 'knex';
import _ from 'lodash';

import { AddressKinds, isDefined, isNotNull } from '@zerologementvacant/shared';
import db, {
  ConflictOptions,
  groupBy,
  onConflict,
  where
} from '~/infra/database';
import { OwnerApi, OwnerPayloadApi } from '~/models/OwnerApi';
import { AddressApi } from '~/models/AddressApi';
import { HousingApi } from '~/models/HousingApi';
import { PaginatedResultApi } from '~/models/PaginatedResultApi';
import { logger } from '~/infra/logger';
import { HousingOwnerDBO, housingOwnersTable } from './housingOwnerRepository';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { ownerMatchTable } from './ownerMatchRepository';
import {
  HousingDBO,
  housingTable,
  ownerHousingJoinClause,
  parseHousingApi
} from './housingRepository';
import { campaignsHousingTable } from './campaignHousingRepository';
import { groupsHousingTable } from './groupRepository';
import { OwnerExportStreamApi } from '~/controllers/housingExportController';
import { banAddressesTable } from './banAddressesRepository';
import Stream = Highland.Stream;

export const ownerTable = 'owners';
export const Owners = (transaction = db) => transaction<OwnerDBO>(ownerTable);

const get = async (ownerId: string): Promise<OwnerApi | null> => {
  const owner = await Owners()
    .modify(include(['banAddress']))
    .where('id', ownerId)
    .first();
  return owner ? parseOwnerApi(owner) : null;
};

interface OwnerFilters {
  fullName?: string;
  idpersonne?: string | string[];
  campaignId?: string;
  groupId?: string;
}

interface FindOptions {
  filters?: OwnerFilters;
  groupBy?: Array<keyof OwnerDBO>;
}

const filteredQuery =
  (filters?: OwnerFilters) => (query: Knex.QueryBuilder) => {
    if (filters?.campaignId) {
      query
        .join(
          housingOwnersTable,
          `${ownerTable}.id`,
          `${housingOwnersTable}.owner_id`
        )
        .join(housingTable, ownerHousingJoinClause)
        .join(campaignsHousingTable, (query) =>
          query
            .on(`${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .andOn(
              `${housingTable}.geo_code`,
              `${campaignsHousingTable}.housing_geo_code`
            )
        )
        .where(`${campaignsHousingTable}.campaign_id`, filters.campaignId);
    }
    if (filters?.groupId) {
      query
        .join(
          housingOwnersTable,
          `${ownerTable}.id`,
          `${housingOwnersTable}.owner_id`
        )
        .join(housingTable, ownerHousingJoinClause)
        .join(groupsHousingTable, (query) =>
          query
            .on(`${housingTable}.id`, `${groupsHousingTable}.housing_id`)
            .andOn(
              `${housingTable}.geo_code`,
              `${groupsHousingTable}.housing_geo_code`
            )
        )
        .where(`${groupsHousingTable}.group_id`, filters.groupId);
    }
  };

const find = async (opts?: FindOptions): Promise<OwnerApi[]> => {
  const whereOptions = where<OwnerFilters>(['fullName']);

  const owners = await Owners()
    .where(whereOptions(opts?.filters))
    .modify((query) => {
      if (opts?.filters?.idpersonne) {
        query
          .join(
            ownerMatchTable,
            `${ownerMatchTable}.owner_id`,
            `${ownerTable}.id`
          )
          .modify((query) => {
            if (opts?.filters?.idpersonne) {
              Array.isArray(opts?.filters?.idpersonne)
                ? query.whereIn(
                    `${ownerMatchTable}.idpersonne`,
                    opts?.filters?.idpersonne
                  )
                : query.where(
                    `${ownerMatchTable}.idpersonne`,
                    opts?.filters?.idpersonne
                  );
            }
          });
      }
    })
    .orderBy('full_name');
  return owners.map(parseOwnerApi);
};

type OwnerInclude = 'banAddress';

function include(includes: OwnerInclude[]) {
  const joins: Record<OwnerInclude, (query: Knex.QueryBuilder) => void> = {
    banAddress: (query) =>
      query.leftJoin(banAddressesTable, (query: any) => {
        query
          .on(`${ownerTable}.id`, `${banAddressesTable}.ref_id`)
          .andOnVal('address_kind', AddressKinds.Owner);
      })
  };

  return (query: Knex.QueryBuilder) => {
    _.uniq(includes).forEach((include) => {
      joins[include](query);
    });
  };
}

const stream = (opts?: StreamOptions): Stream<OwnerApi> => {
  const stream = Owners()
    .modify(groupBy<OwnerDBO>(opts?.groupBy))
    .orderBy('full_name')
    .stream();

  return highland<OwnerDBO>(stream).map(parseOwnerApi);
};

type StreamOptions = FindOptions;

type OwnerExportStreamDBO = OwnerDBO & {
  housing_list: HousingDBO[];
};

const exportStream = (opts: StreamOptions): Stream<OwnerExportStreamApi> => {
  const stream = Owners()
    .modify(filteredQuery(opts.filters))
    .select(
      `${ownerTable}.id`,
      `${ownerTable}.raw_address`,
      `${ownerTable}.full_name`,
      db.raw(`array_agg (to_json(fast_housing.*)) as housing_list`)
    )
    .groupBy(`${ownerTable}.id`)
    .orderByRaw(`count(distinct(${housingOwnersTable}.housing_id)) desc`)
    .stream();

  return highland<OwnerExportStreamDBO>(stream).map(
    (result: OwnerExportStreamDBO): OwnerExportStreamApi => ({
      ...parseOwnerApi(result),
      housingList: result.housing_list.map((housing) =>
        parseHousingApi(housing)
      )
    })
  );
};

interface FindOneOptions {
  id?: string;
  fullName?: string;
  rawAddress?: string[];
  birthDate?: Date;
}

const findOne = async (opts: FindOneOptions): Promise<OwnerApi | null> => {
  const owner = await db<OwnerDBO>(ownerTable)
    .where({
      full_name: opts.fullName,
      raw_address: opts.rawAddress
    })
    .modify((builder) => {
      return opts.birthDate === undefined
        ? builder.whereNull('birth_date')
        : builder.where('birth_date', opts.birthDate);
    })
    .first();
  return owner ? parseOwnerApi(owner) : null;
};

const searchOwners = async (
  q: string,
  page?: number,
  perPage?: number
): Promise<PaginatedResultApi<OwnerApi>> => {
  const filterQuery = db(ownerTable)
    .whereRaw(
      `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
      q
    )
    .orWhereRaw(
      `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
      q?.split(' ').reverse().join(' ')
    );

  const filteredCount: number = await db(ownerTable)
    .whereRaw(
      `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
      q
    )
    .orWhereRaw(
      `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
      q?.split(' ').reverse().join(' ')
    )
    .count('id')
    .first()
    .then((_) => Number(_?.count));

  const totalCount = await db(ownerTable)
    .count('id')
    .first()
    .then((_) => Number(_?.count));

  const results = await filterQuery.modify((queryBuilder: any) => {
    queryBuilder.orderBy('full_name');
    if (page && perPage) {
      queryBuilder.offset((page - 1) * perPage).limit(perPage);
    }
  });

  logger.debug('filteredCount', filteredCount);

  return <PaginatedResultApi<OwnerApi>>{
    entities: results.map((result: any) => parseOwnerApi(result)),
    totalCount,
    filteredCount,
    page,
    perPage
  };
};

const findByHousing = async (
  housing: HousingApi
): Promise<HousingOwnerApi[]> => {
  const owners: Array<OwnerDBO & HousingOwnerDBO> = await db(ownerTable)
    .join(
      housingOwnersTable,
      `${ownerTable}.id`,
      `${housingOwnersTable}.owner_id`
    )
    .modify(include(['banAddress']))
    .whereRaw(`${housingOwnersTable}.rank >= 1`)
    .where(`${housingOwnersTable}.housing_id`, housing.id)
    .where(`${housingOwnersTable}.housing_geo_code`, housing.geoCode)
    .orderBy('end_date', 'desc')
    .orderBy('rank');

  return owners.map(parseHousingOwnerApi);
};

const insert = async (draftOwnerApi: OwnerPayloadApi): Promise<OwnerApi> => {
  logger.info('Insert draftOwnerApi');
  return db(ownerTable)
    .insert({
      raw_address: draftOwnerApi.rawAddress,
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
  opts?: BetterSaveOptions
): Promise<void> {
  logger.debug(`Saving owner...`, { owner });
  await Owners().insert(formatOwnerApi(owner)).modify(onConflict(opts));
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
                .onConflict(['full_name', 'raw_address', 'birth_date'])
                .merge(['administrator', 'owner_kind', 'owner_kind_detail']);
            }
            return builder
              .onConflict(['full_name', 'raw_address', 'birth_date'])
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
                    '(full_name, raw_address, (birth_date IS NULL)) where birth_date is null'
                  )
                )
                .merge(['administrator', 'owner_kind', 'owner_kind_detail']);
            }
            return builder
              .onConflict(
                db.raw(
                  '(full_name, raw_address, (birth_date IS NULL)) where birth_date is null'
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
        raw_address: ownerApi.rawAddress,
        full_name: ownerApi.fullName,
        birth_date: ownerApi.birthDate ?? null,
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

export interface OwnerDBO {
  id: string;
  idpersonne: string | null;
  full_name: string;
  birth_date?: Date | string;
  administrator?: string;
  raw_address: string[];
  owner_kind?: string;
  owner_kind_detail?: string;
  email?: string;
  phone?: string;
  postal_code?: string;
  house_number?: string;
  street?: string;
  city?: string;
  score?: number;
  additional_address?: string;
}

export const parseOwnerApi = (result: OwnerDBO): OwnerApi => ({
  id: result.id,
  idpersonne: result.idpersonne,
  rawAddress: result.raw_address.filter((_: string) => _ && _.length),
  fullName: result.full_name,
  administrator: result.administrator,
  birthDate: result.birth_date ? new Date(result.birth_date) : undefined,
  email: result.email,
  phone: result.phone,
  kind: result.owner_kind,
  kindDetail: result.owner_kind_detail,
  banAddress: [
    result.postal_code,
    result.house_number,
    result.street,
    result.city,
    result.score
  ].some((_) => isDefined(_) && isNotNull(_))
    ? {
        postalCode: result.postal_code ?? '',
        houseNumber: result.house_number,
        street: result.street,
        city: result.city ?? '',
        score: result.score
      }
    : undefined,
  additionalAddress: result.additional_address
});

export const parseHousingOwnerApi = (
  housingOwner: OwnerDBO & HousingOwnerDBO
): HousingOwnerApi => ({
  ...parseOwnerApi(housingOwner),
  housingId: housingOwner.housing_id,
  housingGeoCode: housingOwner.housing_geo_code,
  rank: housingOwner.rank,
  startDate: housingOwner.start_date,
  endDate: housingOwner.end_date,
  origin: housingOwner.origin
});

export const formatOwnerApi = (ownerApi: OwnerApi): OwnerDBO => ({
  id: ownerApi.id,
  idpersonne: ownerApi.idpersonne,
  raw_address: ownerApi.rawAddress.filter((_: string) => _ && _.length),
  full_name: ownerApi.fullName,
  administrator: ownerApi.administrator,
  birth_date: ownerApi.birthDate,
  email: ownerApi.email,
  phone: ownerApi.phone,
  owner_kind: ownerApi.kind,
  owner_kind_detail: ownerApi.kindDetail,
  additional_address: ownerApi.additionalAddress
});

export default {
  find,
  stream,
  exportStream,
  get,
  findOne,
  searchOwners,
  findByHousing,
  insert,
  betterSave,
  save,
  saveMany,
  update,
  updateAddressList,
  deleteHousingOwners,
  insertHousingOwners
};
