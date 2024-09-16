import { AddressKinds } from '@zerologementvacant/models';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { AddressApi, AddressToNormalize } from '~/models/AddressApi';
import { Housing, housingTable } from './housingRepository';

export const banAddressesTable = 'ban_addresses';
export const Addresses = (transaction = db) =>
  transaction<AddressDBO>(banAddressesTable);

export interface AddressDBO {
  ref_id: string;
  address_kind: AddressKinds;
  address: string;
  /**
   * @deprecated See {@link address}
   */
  house_number?: string;
  /**
   * @deprecated See {@link street}
   */
  street?: string;
  /**
   * @deprecated See {@link address}
   */
  postal_code?: string;
  /**
   * @deprecated See {@link address}
   */
  city?: string;
  latitude?: number;
  longitude?: number;
  score?: number;
  last_updated_at?: Date | string;
}

const logger = createLogger('banAddressRepository');

async function save(address: AddressApi): Promise<void> {
  await saveMany([address]);
}

async function saveMany(addresses: ReadonlyArray<AddressApi>): Promise<void> {
  logger.debug(`Saving ${addresses.length} BAN addresses...`);
  await Addresses()
    .insert(addresses.map(formatAddressApi))
    .onConflict(['ref_id', 'address_kind'])
    .merge([
      'address',
      'house_number',
      'street',
      'postal_code',
      'city',
      'latitude',
      'longitude',
      'score',
      'last_updated_at'
    ]);
  logger.debug(`Saved ${addresses.length} addresses.`);
}

const getByRefId = async (
  refId: string,
  addressKind: AddressKinds
): Promise<AddressApi | null> => {
  logger.debug('Get ban adresse with ref id', {
    ref: refId,
    addressKind
  });
  const address = await db(banAddressesTable)
    .where('ref_id', refId)
    .andWhere('address_kind', addressKind)
    .first();
  return address ? parseAddressApi(address) : null;
};

async function listAddressesToNormalize(): Promise<AddressToNormalize[]> {
  const housings = await Housing()
    .select(
      `${housingTable}.id`,
      `${housingTable}.address_dgfip`,
      `${housingTable}.geo_code`
    )
    .leftJoin<AddressDBO>(banAddressesTable, (join) => {
      join
        .on(`${housingTable}.id`, `${banAddressesTable}.ref_id`)
        .andOnVal('address_kind', AddressKinds.Housing);
    })
    .where((where) => {
      where
        .whereNull('last_updated_at')
        .orWhere(
          'last_updated_at',
          '<',
          db.raw(`current_timestamp  - interval '${config.ban.update.delay}'`)
        );
    })
    .orderBy([{ column: 'last_updated_at', order: 'asc', nulls: 'first' }])
    .limit(config.ban.update.pageSize);

  return housings.map<AddressToNormalize>((housing) => ({
    refId: housing.id,
    addressKind: AddressKinds.Housing,
    label: housing.address_dgfip.join(' '),
    geoCode: housing.geo_code
  }));
}

const upsertList = async (addresses: AddressApi[]): Promise<AddressApi[]> => {
  logger.info('Upsert address list', addresses.length);

  const upsertedAddresses = addresses
    .filter((_) => _.refId)
    .filter(
      (value, index, self) =>
        self.findIndex((_) => _.refId === value.refId) === index
    )
    .map((addressApi) => ({
      ...formatAddressApi(addressApi),
      last_updated_at: new Date()
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
        'last_updated_at'
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

export const parseAddressApi = (address: AddressDBO): AddressApi => ({
  refId: address.ref_id,
  addressKind: address.address_kind,
  label: address.address,
  houseNumber: address.house_number,
  street: address.street,
  postalCode: address.postal_code ?? '',
  city: address.city ?? '',
  latitude: address.latitude,
  longitude: address.longitude,
  score: address.score,
  lastUpdatedAt: address.last_updated_at
    ? new Date(address.last_updated_at).toJSON()
    : undefined
});

export const formatAddressApi = (address: AddressApi): AddressDBO => ({
  ref_id: address.refId,
  address_kind: address.addressKind,
  address: address.label,
  house_number: address.houseNumber,
  street: address.street,
  postal_code: address.postalCode,
  city: address.city,
  latitude: address.latitude,
  longitude: address.longitude,
  score: address.score,
  last_updated_at: address.lastUpdatedAt
    ? new Date(address.lastUpdatedAt)
    : undefined
});

export default {
  save,
  saveMany,
  getByRefId,
  listAddressesToNormalize,
  markAddressToBeNormalized,
  upsertList
};
