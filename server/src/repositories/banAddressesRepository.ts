import { AddressKinds } from '@zerologementvacant/shared';
import config from '~/infra/config';
import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { AddressApi, AddressToNormalize } from '~/models/AddressApi';
import { housingTable } from './housingRepository';

export const banAddressesTable = 'ban_addresses';

const getByRefId = async (
  refId: string,
  addressKind: AddressKinds,
): Promise<AddressApi | null> => {
  logger.debug('Get ban adresse with ref id', {
    ref: refId,
    addressKind,
  });
  const address = await db(banAddressesTable)
    .where('ref_id', refId)
    .andWhere('address_kind', addressKind)
    .first();
  return address ? parseAddressApi(address) : null;
};

const orderWithLimit = (query: any) => {
  query
    .orderByRaw('last_updated_at asc nulls first')
    .limit(config.ban.update.pageSize);
};

const lastUpdatedClause = (query: any) => {
  query
    .whereNull('last_updated_at')
    .orWhere(
      'last_updated_at',
      '<',
      db.raw(`current_timestamp  - interval '${config.ban.update.delay}'`),
    );
};

const listAddressesToNormalize = async (): Promise<AddressToNormalize[]> => {
  return db(housingTable)
    .select(
      'id',
      'raw_address',
      db.raw(`'${AddressKinds.Housing}' as address_kind`),
      'last_updated_at',
      'geo_code',
    )
    .leftJoin(banAddressesTable, (query: any) => {
      query
        .on(`${housingTable}.id`, `${banAddressesTable}.ref_id`)
        .andOnVal('address_kind', AddressKinds.Housing);
    })
    .modify(lastUpdatedClause)
    .modify(orderWithLimit)
    .then((_) =>
      _.map(
        (result: any) =>
          <AddressToNormalize>{
            refId: result.id,
            addressKind: result.address_kind,
            rawAddress: result.raw_address,
            geoCode: result.geo_code,
          },
      ),
    );
};

const upsertList = async (addresses: AddressApi[]): Promise<AddressApi[]> => {
  logger.info('Upsert address list', addresses.length);

  const upsertedAddresses = addresses
    .filter((_) => _.refId)
    .filter(
      (value, index, self) =>
        self.findIndex((_) => _.refId === value.refId) === index,
    )
    .map((addressApi) => ({
      ...formatAddressApi(addressApi),
      last_updated_at: new Date(),
    }));

  if (!upsertedAddresses.length) {
    return [];
  }

  try {
    return db(banAddressesTable)
      .insert(upsertedAddresses)
      .onConflict(['ref_id', 'address_kind'])
      .merge([
        'house_number',
        'street',
        'postal_code',
        'city',
        'latitude',
        'longitude',
        'score',
        'last_updated_at',
      ])
      .returning('*');
  } catch (err) {
    console.error('Upserting addresses failed', err, addresses.length);
    throw new Error('Upserting addresses failed');
  }
};

const markAddressToBeNormalized = async (
  addressId: string,
  addressKind: AddressKinds,
) => {
  db(banAddressesTable)
    .where('ref_id', addressId)
    .andWhere('address_kind', addressKind)
    .update({ last_updated_at: null });
};

export const parseAddressApi = (result: any) =>
  <AddressApi>{
    refId: result.ref_id,
    addressKind: result.address_kind,
    houseNumber: result.house_number,
    street: result.street,
    postalCode: result.postal_code,
    city: result.city,
    latitude: result.latitude,
    longitude: result.longitude,
    score: result.score,
  };

export const formatAddressApi = (addressApi: AddressApi) => ({
  ref_id: addressApi.refId,
  address_kind: addressApi.addressKind,
  house_number: addressApi.houseNumber ?? '',
  street: addressApi.street,
  postal_code: addressApi.postalCode,
  city: addressApi.city,
  latitude: addressApi.latitude,
  longitude: addressApi.longitude,
  score: addressApi.score,
});

export default {
  getByRefId,
  listAddressesToNormalize,
  markAddressToBeNormalized,
  upsertList,
};
