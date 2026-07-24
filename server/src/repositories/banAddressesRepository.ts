import { AddressKinds } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
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
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('banAddresses')
      .values(addresses.map(toAddressInsert))
      .onConflict((oc) =>
        oc.columns(['refId', 'addressKind']).doUpdateSet((eb) => ({
          address: eb.ref('excluded.address'),
          banId: eb.ref('excluded.banId'),
          houseNumber: eb.ref('excluded.houseNumber'),
          street: eb.ref('excluded.street'),
          postalCode: eb.ref('excluded.postalCode'),
          city: eb.ref('excluded.city'),
          cityCode: eb.ref('excluded.cityCode'),
          latitude: eb.ref('excluded.latitude'),
          longitude: eb.ref('excluded.longitude'),
          score: eb.ref('excluded.score'),
          lastUpdatedAt: eb.ref('excluded.lastUpdatedAt')
        }))
      )
      .execute();
  });
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
  const row = await kysely
    .selectFrom('banAddresses')
    .selectAll()
    .where('refId', '=', refId)
    .where('addressKind', '=', addressKind)
    .executeTakeFirst();
  return row ? parseAddressRow(row) : null;
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

// ---------------------------------------------------------------------------
// Kysely read/write path — parseAddressApi/formatAddressApi above stay
// snake_case since ownerRepository.ts reuses parseAddressApi on a
// to_json(ban.*) blob, which stays snake_case regardless of engine
// (CamelCasePlugin's maintainNestedObjectKeys leaves raw-SQL JSON
// aggregates untouched).
// ---------------------------------------------------------------------------

type AddressRow = Selectable<DB['banAddresses']>;

function parseAddressRow(row: AddressRow): AddressApi {
  return {
    refId: row.refId,
    addressKind: row.addressKind as AddressKinds,
    banId: row.banId ?? undefined,
    label: row.address,
    houseNumber: row.houseNumber ?? undefined,
    street: row.street ?? undefined,
    postalCode: row.postalCode ?? '',
    city: row.city ?? '',
    cityCode: row.cityCode ?? null,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    score: row.score ?? undefined,
    lastUpdatedAt: row.lastUpdatedAt
      ? new Date(row.lastUpdatedAt as unknown as string).toJSON()
      : undefined
  };
}

function toAddressInsert(address: AddressApi) {
  return {
    refId: address.refId,
    banId: address.banId ?? null,
    addressKind: address.addressKind,
    address: address.label,
    houseNumber: address.houseNumber,
    street: address.street,
    postalCode: address.postalCode,
    city: address.city,
    cityCode: address.cityCode ?? null,
    latitude: address.latitude,
    longitude: address.longitude,
    score: address.score,
    lastUpdatedAt: address.lastUpdatedAt
      ? new Date(address.lastUpdatedAt)
      : undefined
  };
}

export const remove = async (refId: string, addressKind: AddressKinds) => {
  logger.debug('Get ban adresse with ref id', {
    ref: refId,
    addressKind
  });
  await kysely
    .deleteFrom('banAddresses')
    .where('refId', '=', refId)
    .where('addressKind', '=', addressKind)
    .execute();

  logger.debug(`Deleted ${addressKind} refId=${refId} address.`);
};

export default {
  save,
  saveMany,
  getByRefId,
  remove
};
