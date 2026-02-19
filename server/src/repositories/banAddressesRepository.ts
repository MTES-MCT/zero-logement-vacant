import { AddressKinds } from '@zerologementvacant/models';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';

export const banAddressesTable = 'ban_addresses';
export const Addresses = (transaction = db) =>
  transaction<AddressDBO>(banAddressesTable);

export interface AddressDBO {
  ref_id: string;
  address_kind: AddressKinds;
  ban_id: string | null;
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
  city_code?: string | null;
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
      'ban_id',
      'house_number',
      'street',
      'postal_code',
      'city',
      'city_code',
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

export const parseAddressApi = (address: AddressDBO): AddressApi => ({
  refId: address.ref_id,
  addressKind: address.address_kind,
  banId: address.ban_id ?? undefined,
  label: address.address,
  houseNumber: address.house_number,
  street: address.street,
  postalCode: address.postal_code ?? '',
  city: address.city ?? '',
  cityCode: address.city_code ?? null,
  latitude: address.latitude,
  longitude: address.longitude,
  score: address.score,
  lastUpdatedAt: address.last_updated_at
    ? new Date(address.last_updated_at).toJSON()
    : undefined
});

export const formatAddressApi = (address: AddressApi): AddressDBO => ({
  ref_id: address.refId,
  ban_id: address.banId ?? null,
  address_kind: address.addressKind,
  address: address.label,
  house_number: address.houseNumber,
  street: address.street,
  postal_code: address.postalCode,
  city: address.city,
  city_code: address.cityCode ?? null,
  latitude: address.latitude,
  longitude: address.longitude,
  score: address.score,
  last_updated_at: address.lastUpdatedAt
    ? new Date(address.lastUpdatedAt)
    : undefined
});

export const remove = async (
  refId: string,
  addressKind: AddressKinds
) => {
  logger.debug('Get ban adresse with ref id', {
    ref: refId,
    addressKind
  });
  await db(banAddressesTable)
    .where('ref_id', refId)
    .andWhere('address_kind', addressKind)
    .delete();

    logger.debug(`Deleted ${addressKind} refId=${refId} address.`);
};

export default {
  save,
  saveMany,
  getByRefId,
  remove,
};
