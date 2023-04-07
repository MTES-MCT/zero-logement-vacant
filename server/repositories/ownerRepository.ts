import db from './db';
import { DraftOwnerApi, HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import { AddressApi } from '../models/AddressApi';
import { HousingApi, OccupancyKindApi } from '../models/HousingApi';
import { ownersHousingTable, ReferenceDataYear } from './housingRepository';
import { Paginated } from '../../shared/models/Pagination';

export const ownerTable = 'owners';

const get = async (ownerId: string): Promise<OwnerApi | null> => {
  const owner = await db(ownerTable).where('id', ownerId).first();
  return owner ? parseOwnerApi(owner) : null;
};

const searchOwners = async (
  q: string,
  page?: number,
  perPage?: number
): Promise<Paginated<OwnerApi>> => {
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

    return <Paginated<OwnerApi>>{
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

const listByHousing = async (housingId: string): Promise<HousingOwnerApi[]> => {
  try {
    return db(ownerTable)
      .select(
        '*',
        db.raw(
          '(select count(*)\n' +
            '        from owners_housing oh2, housing h\n' +
            '        where oh1.owner_id = oh2.owner_id\n' +
            '          and oh2.housing_id = h.id\n' +
            '          and ((h.occupancy = ? and h.vacancy_start_year <= ?) or h.occupancy = ?)\n' +
            '          and current_date between coalesce(oh2.start_date, current_date) and coalesce(oh2.end_date, current_date)) as housing_count',
          [
            OccupancyKindApi.Vacant,
            ReferenceDataYear - 2,
            OccupancyKindApi.Rent,
          ]
        )
      )
      .join({ oh1: ownersHousingTable }, `${ownerTable}.id`, 'oh1.owner_id')
      .where('oh1.housing_id', housingId)
      .orderBy('end_date', 'desc')
      .orderBy('rank')
      .then((_) => _.map((result: any) => parseHousingOwnerApi(result)));
  } catch (err) {
    console.error('Listing owners by housing failed', err, housingId);
    throw new Error('Listing owners by housing failed');
  }
};

const insert = async (draftOwnerApi: DraftOwnerApi): Promise<OwnerApi> => {
  console.log('Insert draftOwnerApi');
  try {
    return db(ownerTable)
      .insert({
        raw_address: draftOwnerApi.rawAddress,
        full_name: draftOwnerApi.fullName,
        birth_date: draftOwnerApi.birthDate
          ? new Date(draftOwnerApi.birthDate)
          : undefined,
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

const update = async (ownerApi: OwnerApi): Promise<OwnerApi> => {
  try {
    return db(ownerTable)
      .where('id', ownerApi.id)
      .update({
        raw_address: ownerApi.rawAddress,
        full_name: ownerApi.fullName,
        birth_date: ownerApi.birthDate
          ? new Date(ownerApi.birthDate)
          : undefined,
        email: ownerApi.email,
        phone: ownerApi.phone,
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

export const parseOwnerApi = (result: any) =>
  <OwnerApi>{
    id: result.id,
    rawAddress: result.raw_address.filter((_: string) => _ && _.length),
    address: <AddressApi>{
      houseNumber: result.house_number,
      street: result.street,
      postalCode: result.postal_code,
      city: result.city,
    },
    fullName: result.full_name,
    administrator: result.administrator,
    birthDate: result.birth_date,
    email: result.email,
    phone: result.phone,
  };

export const parseHousingOwnerApi = (result: any) =>
  <HousingOwnerApi>{
    ...parseOwnerApi(result),
    housingId: result.housing_id,
    rank: result.rank,
    startDate: result.start_date,
    endDate: result.end_date,
    origin: result.origin,
    housingCount: Number(result.housing_count),
  };

const formatOwnerApi = (ownerApi: OwnerApi) => ({
  id: ownerApi.id,
  raw_address: ownerApi.rawAddress.filter((_: string) => _ && _.length),
  full_name: ownerApi.fullName,
  administrator: ownerApi.administrator,
  birth_date: ownerApi.birthDate,
  email: ownerApi.email,
  phone: ownerApi.phone,
});

export default {
  get,
  searchOwners,
  listByHousing,
  insert,
  update,
  updateAddressList,
  deleteHousingOwners,
  insertHousingOwners,
  formatOwnerApi,
};
