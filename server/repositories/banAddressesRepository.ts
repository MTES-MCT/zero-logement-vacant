import {
  AddressApi,
  AddressKinds,
  AddressToNormalize,
} from '../models/AddressApi';
import db from './db';
import { housingTable } from './housingRepository';
import { ownerTable } from './ownerRepository';
import config from '../utils/config';
import { logger } from '../utils/logger';

export const banAddressesTable = 'ban_addresses';

const getByRefId = async (
  refId: string,
  addressKind: AddressKinds
): Promise<AddressApi | null> => {
  logger.info('Get ban adresse with ref id', refId, addressKind);
  const address = db(banAddressesTable)
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
      db.raw(`current_timestamp  - interval '${config.ban.update.delay}'`)
    );
};

const listAddressesToNormalize = async (): Promise<AddressToNormalize[]> => {
  return db
    .union(
      [
        db(housingTable)
          .select(
            'id',
            'raw_address',
            db.raw(`'${AddressKinds.Housing}' as address_kind`),
            'last_updated_at',
            'geo_code'
          )
          .leftJoin(banAddressesTable, (query: any) => {
            query
              .on(`${housingTable}.id`, `${banAddressesTable}.ref_id`)
              .andOnVal('address_kind', AddressKinds.Housing);
          })
          .modify(lastUpdatedClause)
          .modify(orderWithLimit),
        db(ownerTable)
          .select(
            'id',
            'raw_address',
            db.raw(`'${AddressKinds.Owner}' as address_kind`),
            'last_updated_at',
            db.raw('null as geo_code')
          )
          .leftJoin(banAddressesTable, (query: any) => {
            query
              .on(`${ownerTable}.id`, `${banAddressesTable}.ref_id`)
              .andOnVal('address_kind', AddressKinds.Owner);
          })
          .modify(lastUpdatedClause)
          .modify(orderWithLimit),
      ],
      true
    )
    .modify(orderWithLimit)
    .then((_) =>
      _.map(
        (result: any) =>
          <AddressToNormalize>{
            refId: result.id,
            addressKind: result.address_kind,
            rawAddress: result.raw_address,
            geoCode: result.geo_code,
          }
      )
    );
};

const upsertList = async (addresses: AddressApi[]): Promise<AddressApi[]> => {
  console.log('Upsert address list', addresses.length);

  const upsertedAddresses = addresses
    .filter((_) => _.refId)
    .filter(
      (value, index, self) =>
        self.findIndex((_) => _.refId === value.refId) === index
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
  addressKind: AddressKinds
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

const escapeValue = (value?: string) => {
  return value ? value.replace(/'/g, "''") : '';
};

const formatAddressApi = (addressApi: AddressApi) => ({
  ref_id: addressApi.refId,
  address_kind: addressApi.addressKind,
  house_number: addressApi.houseNumber ?? '',
  street: escapeValue(addressApi.street),
  postal_code: addressApi.postalCode,
  city: escapeValue(addressApi.city),
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
