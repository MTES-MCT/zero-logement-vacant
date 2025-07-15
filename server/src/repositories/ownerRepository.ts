import { AddressKinds, OwnerEntity } from '@zerologementvacant/models';
import highland from 'highland';
import { Knex } from 'knex';
import _ from 'lodash';
import { match, Pattern } from 'ts-pattern';
import { OwnerExportStreamApi } from '~/controllers/housingExportController';
import db, {
  ConflictOptions,
  groupBy,
  onConflict,
  where
} from '~/infra/database';
import { logger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { PaginatedResultApi } from '~/models/PaginatedResultApi';
import { compact } from '~/utils/object';
import {
  AddressDBO,
  banAddressesTable,
  parseAddressApi
} from './banAddressesRepository';
import { campaignsHousingTable } from './campaignHousingRepository';
import { GROUPS_HOUSING_TABLE } from './groupRepository';
import { HousingOwnerDBO, housingOwnersTable } from './housingOwnerRepository';
import {
  HousingDBO,
  housingTable,
  ownerHousingJoinClause,
  parseHousingApi
} from './housingRepository';
import Stream = Highland.Stream;

export const ownerTable = 'owners';
export const Owners = (transaction = db) => transaction<OwnerDBO>(ownerTable);

const get = async (ownerId: string): Promise<OwnerApi | null> => {
  const owner = await Owners()
    .select(`${ownerTable}.*`)
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
        .join(GROUPS_HOUSING_TABLE, (query) =>
          query
            .on(`${housingTable}.id`, `${GROUPS_HOUSING_TABLE}.housing_id`)
            .andOn(
              `${housingTable}.geo_code`,
              `${GROUPS_HOUSING_TABLE}.housing_geo_code`
            )
        )
        .where(`${GROUPS_HOUSING_TABLE}.group_id`, filters.groupId);
    }
  };

const find = async (opts?: FindOptions): Promise<OwnerApi[]> => {
  const whereOptions = where<OwnerFilters>(['fullName']);

  const owners = await Owners()
    .where(whereOptions(opts?.filters))
    .modify((query) => {
      if (opts?.filters?.idpersonne) {
        query.whereIn(
          'idpersonne',
          Array.isArray(opts.filters.idpersonne)
            ? opts.filters.idpersonne
            : [opts.filters.idpersonne]
        );
      }
    })
    .orderBy('full_name');
  return owners.map(parseOwnerApi);
};

type OwnerInclude = 'banAddress';

function include(includes: OwnerInclude[]) {
  const joins: Record<OwnerInclude, (query: Knex.QueryBuilder) => void> = {
    banAddress: (query) =>
      query
        .leftJoin(banAddressesTable, (query: any) => {
          query
            .on(`${ownerTable}.id`, `${banAddressesTable}.ref_id`)
            .andOnVal('address_kind', AddressKinds.Owner);
        })
        .select(db.raw(`to_json(${banAddressesTable}.*) AS ban`))
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
      `${ownerTable}.address_dgfip`,
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

interface FindOneOptions
  extends Partial<
    Pick<OwnerApi, 'id' | 'idpersonne' | 'fullName' | 'rawAddress'>
  > {
  birthDate?: Date;
}

async function findOne(opts: FindOneOptions): Promise<OwnerApi | null> {
  const owner = await Owners()
    .where(
      compact({
        idpersonne: opts.idpersonne,
        full_name: opts.fullName,
        address_dgfip: opts.rawAddress,
        birth_date: opts.birthDate
      })
    )
    .first();
  return owner ? parseOwnerApi(owner) : null;
}

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

  const filterQuery = db(ownerTable)
    .select('*')
    .whereRaw(`full_name_fts @@ to_tsquery('simple', ?)`, [tsQuery])
    .orderBy('id', 'desc');

  const filteredCount = await db(ownerTable)
    .whereRaw(`full_name_fts @@ to_tsquery('simple', ?)`, [tsQuery])
    .count('id')
    .first()
    .then((row) => Number(row?.count));

  const totalCount = await db(ownerTable)
    .count('id')
    .first()
    .then((row) => Number(row?.count));

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
    .select(`${ownerTable}.*`)
    .join(
      housingOwnersTable,
      `${ownerTable}.id`,
      `${housingOwnersTable}.owner_id`
    )
    .select(`${housingOwnersTable}.*`)
    .modify(include(['banAddress']))
    .where(`${housingOwnersTable}.housing_id`, housing.id)
    .where(`${housingOwnersTable}.housing_geo_code`, housing.geoCode)
    .orderBy('end_date', 'desc')
    .orderBy('rank');

  return owners.map(parseHousingOwnerApi);
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
                .onConflict(['full_name', 'address_dgfip', 'birth_date'])
                .merge(['administrator', 'kind_class', 'owner_kind_detail']);
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
                .merge(['administrator', 'kind_class', 'owner_kind_detail']);
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

export interface OwnerRecordDBO {
  id: string;
  idpersonne: string | null;
  full_name: string;
  birth_date: Date | string | null;
  administrator: string | null;
  siren: string | null;
  address_dgfip: string[] | null;
  // ban_address: string | null;
  additional_address: string | null;
  email: string | null;
  phone: string | null;
  data_source: string | null;
  kind_class: string | null;
  owner_kind_detail: string | null;
  entity: OwnerEntity | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
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
    idpersonne: owner.idpersonne ?? undefined,
    rawAddress: owner.address_dgfip,
    fullName: owner.full_name,
    administrator: owner.administrator ?? null,
    birthDate: birthDate,
    email: owner.email ?? null,
    phone: owner.phone ?? null,
    kind: owner.kind_class,
    kindDetail: owner.owner_kind_detail ?? null,
    siren: owner.siren ?? undefined,
    banAddress: owner.ban ? parseAddressApi(owner.ban) : null,
    additionalAddress: owner.additional_address ?? null,
    entity: owner.entity,
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
  owner_kind_detail: owner.kindDetail ?? null,
  entity: owner.entity,
  created_at: owner.createdAt ? new Date(owner.createdAt) : null,
  updated_at: owner.updatedAt ? new Date(owner.updatedAt) : null
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
