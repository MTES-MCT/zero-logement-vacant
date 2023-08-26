import db from './db';
import { DraftOwnerApi, HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import { AddressApi } from '../models/AddressApi';
import { HousingApi } from '../models/HousingApi';
import { ownersHousingTable } from './housingRepository';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { logger } from '../utils/logger';
import highland from 'highland';
import Stream = Highland.Stream;

export const ownerTable = 'owners';
export const Owners = () => db<OwnerDBO>(ownerTable);
export const OwnersHousing = () => db<HousingOwnerDBO>(ownersHousingTable);

const get = async (ownerId: string): Promise<OwnerApi | null> => {
  const owner = await db<OwnerDBO>(ownerTable).where('id', ownerId).first();
  return owner ? parseOwnerApi(owner) : null;
};

interface FindOptions {
  fullName?: string;
}

const find = async (opts?: FindOptions): Promise<OwnerApi[]> => {
  const owners = await db<OwnerDBO>(ownerTable)
    .modify((query) => {
      if (opts?.fullName) {
        query.where('full_name', opts.fullName);
      }
    })
    .orderBy('full_name');
  return owners.map(parseOwnerApi);
};

const stream = (): Stream<OwnerApi> => {
  const stream = db<OwnerDBO>(ownerTable).orderBy('full_name').stream();

  return highland<OwnerDBO>(stream).map(parseOwnerApi);
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
      raw_address: opts.rawAddress,
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
  try {
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

    console.log('filteredCount', filteredCount);

    return <PaginatedResultApi<OwnerApi>>{
      entities: results.map((result: any) => parseOwnerApi(result)),
      totalCount,
      filteredCount,
      page,
      perPage,
    };
  } catch (err) {
    console.error('Searching owners failed', err, q);
    throw new Error('Searching owner failed');
  }
};

const listByHousing = async (
  housing: HousingApi
): Promise<HousingOwnerApi[]> => {
  const owners: HousingOwnerDBO[] = await db(ownerTable)
    .join(
      ownersHousingTable,
      `${ownerTable}.id`,
      `${ownersHousingTable}.owner_id`
    )
    .whereRaw(`${ownersHousingTable}.rank >= 1`)
    .where(`${ownersHousingTable}.housing_id`, housing.id)
    .where(`${ownersHousingTable}.housing_geo_code`, housing.geoCode)
    .orderBy('end_date', 'desc')
    .orderBy('rank');

  return owners.map(parseHousingOwnerApi);
};

const insert = async (draftOwnerApi: DraftOwnerApi): Promise<OwnerApi> => {
  console.log('Insert draftOwnerApi');
  try {
    return db(ownerTable)
      .insert({
        raw_address: draftOwnerApi.rawAddress,
        full_name: draftOwnerApi.fullName,
        birth_date: draftOwnerApi.birthDate,
        email: draftOwnerApi.email,
        phone: draftOwnerApi.phone,
      })
      .returning('*')
      .then((_) => parseOwnerApi(_[0]));
  } catch (err) {
    console.error('Inserting owner failed', err);
    throw new Error('Inserting owner failed');
  }
};

interface SaveOptions {
  /**
   * @default 'ignore'
   */
  onConflict?: 'merge' | 'ignore';
}

async function save(owner: OwnerApi, opts?: SaveOptions): Promise<void> {
  return saveMany([owner], opts);
}

async function saveMany(owners: OwnerApi[], opts?: SaveOptions): Promise<void> {
  logger.trace(`Save ${owners.length} owner(s)`);

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
        birth_date: ownerApi.birthDate,
        email: ownerApi.email ?? null,
        phone: ownerApi.phone ?? null,
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
    return db(ownersHousingTable)
      .insert(
        housingOwners.map((ho) => ({
          owner_id: ho.id,
          housing_id: ho.housingId,
          housing_geo_code: ho.housingGeoCode,
          rank: ho.rank,
          start_date: ho.startDate,
          end_date: ho.endDate,
          origin: ho.origin,
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
    return db(ownersHousingTable)
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
  full_name: string;
  birth_date?: Date;
  administrator?: string;
  raw_address: string[];
  owner_kind?: string;
  owner_kind_detail?: string;
  email?: string;
  phone?: string;
}

export interface HousingOwnerDBO {
  owner_id: string;
  housing_id: string;
  housing_geo_code: string;
  rank: number;
  start_date?: Date;
  end_date?: Date;
  origin?: string;
}

export const parseOwnerApi = (result: OwnerDBO): OwnerApi => ({
  id: result.id,
  rawAddress: result.raw_address.filter((_: string) => _ && _.length),
  fullName: result.full_name,
  administrator: result.administrator,
  birthDate: result.birth_date,
  email: result.email,
  phone: result.phone,
});

export const parseHousingOwnerApi = (result: any): HousingOwnerApi => ({
  ...parseOwnerApi(result),
  housingId: result.housing_id,
  housingGeoCode: result.housing_geo_code,
  rank: result.rank,
  startDate: result.start_date,
  endDate: result.end_date,
  origin: result.origin,
});

export const formatOwnerApi = (ownerApi: OwnerApi): OwnerDBO => ({
  id: ownerApi.id,
  raw_address: ownerApi.rawAddress.filter((_: string) => _ && _.length),
  full_name: ownerApi.fullName,
  administrator: ownerApi.administrator,
  birth_date: ownerApi.birthDate ? new Date(ownerApi.birthDate) : undefined,
  email: ownerApi.email,
  phone: ownerApi.phone,
});

export const formatOwnerHousingApi = (
  housing: HousingApi
): HousingOwnerDBO => ({
  housing_id: housing.id,
  housing_geo_code: housing.geoCode,
  rank: 1,
  owner_id: housing.owner.id,
});

export const formatHousingOwnerApi = (
  housingOwnerApi: HousingOwnerApi
): HousingOwnerDBO => ({
  owner_id: housingOwnerApi.id,
  housing_id: housingOwnerApi.housingId,
  housing_geo_code: housingOwnerApi.housingGeoCode,
  rank: housingOwnerApi.rank,
  start_date: housingOwnerApi.startDate,
  end_date: housingOwnerApi.endDate,
  origin: housingOwnerApi.origin,
});

export default {
  find,
  stream,
  get,
  findOne,
  searchOwners,
  listByHousing,
  insert,
  save,
  saveMany,
  update,
  updateAddressList,
  deleteHousingOwners,
  insertHousingOwners,
  formatOwnerApi,
};
