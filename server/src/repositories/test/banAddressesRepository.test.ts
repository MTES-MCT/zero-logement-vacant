import { faker } from '@faker-js/faker/locale/fr';
import { AddressKinds } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { AddressApi } from '~/models/AddressApi';
import banAddressesRepository, {
  toAddressInsert
} from '~/repositories/banAddressesRepository';
import { toHousingInsert } from '~/repositories/housingRepository';
import { genAddressApi, genHousingApi } from '~/test/testFixtures';

describe('BAN addresses repository', () => {
  describe('save', () => {
    it('should save a BAN address', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);

      await banAddressesRepository.save(address);

      const actual = await kysely
        .selectFrom('banAddresses')
        .selectAll('banAddresses')
        .where('refId', '=', refId)
        .where('addressKind', '=', AddressKinds.Housing)
        .executeTakeFirst();
      expect(actual).toStrictEqual<Selectable<DB['banAddresses']>>({
        refId,
        addressKind: AddressKinds.Housing,
        banId: address.banId as string,
        address: address.label,
        houseNumber: address.houseNumber ?? null,
        street: address.street ?? null,
        postalCode: address.postalCode,
        city: address.city,
        cityCode: null,
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score ?? null,
        lastUpdatedAt: address.lastUpdatedAt
          ? new Date(address.lastUpdatedAt)
          : null
      });
    });

    it('should update an existing BAN address', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();
      const newAddress: AddressApi = genAddressApi(refId, AddressKinds.Housing);

      await banAddressesRepository.save(newAddress);

      const actual = await kysely
        .selectFrom('banAddresses')
        .selectAll('banAddresses')
        .where('refId', '=', refId)
        .where('addressKind', '=', AddressKinds.Housing)
        .executeTakeFirst();
      expect(actual).toStrictEqual<Selectable<DB['banAddresses']>>({
        refId,
        addressKind: AddressKinds.Housing,
        banId: newAddress.banId as string,
        address: newAddress.label,
        houseNumber: newAddress.houseNumber ?? null,
        street: newAddress.street ?? null,
        postalCode: newAddress.postalCode,
        city: newAddress.city,
        cityCode: null,
        latitude: newAddress.latitude ?? null,
        longitude: newAddress.longitude ?? null,
        score: newAddress.score ?? null,
        lastUpdatedAt: newAddress.lastUpdatedAt
          ? new Date(newAddress.lastUpdatedAt)
          : null
      });
    });
  });

  describe('saveMany', () => {
    it('should save thousands of records', async () => {
      const housings = Array.from({ length: 2_000 }, () => genHousingApi());
      for (let index = 0; index < housings.length; index += 500) {
        await kysely
          .insertInto('fastHousing')
          .values(housings.slice(index, index + 500).map(toHousingInsert))
          .execute();
      }
      const addresses = housings.map((housing) => {
        return genAddressApi(housing.id, AddressKinds.Housing);
      });

      await banAddressesRepository.saveMany(addresses);

      const actual = await kysely
        .selectFrom('banAddresses')
        .selectAll('banAddresses')
        .where('addressKind', '=', AddressKinds.Housing)
        .execute();
      expect(actual.length).toBeGreaterThanOrEqual(addresses.length);
    }, 10_000);
  });

  describe('getByRefId', () => {
    it('should return the address matching refId and addressKind', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();

      const actual = await banAddressesRepository.getByRefId(
        refId,
        AddressKinds.Housing
      );

      expect(actual).toMatchObject<Partial<AddressApi>>({
        refId,
        addressKind: AddressKinds.Housing,
        label: address.label
      });
    });

    it('should return null if no address matches', async () => {
      const actual = await banAddressesRepository.getByRefId(
        faker.string.uuid(),
        AddressKinds.Housing
      );

      expect(actual).toBeNull();
    });

    it('should not return an address of a different addressKind', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();

      const actual = await banAddressesRepository.getByRefId(
        refId,
        AddressKinds.Owner
      );

      expect(actual).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove the address matching refId and addressKind', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();

      await banAddressesRepository.remove(refId, AddressKinds.Housing);

      const row = await kysely
        .selectFrom('banAddresses')
        .selectAll('banAddresses')
        .where('refId', '=', refId)
        .where('addressKind', '=', AddressKinds.Housing)
        .executeTakeFirst();
      expect(row).toBeUndefined();
    });

    it('should not remove an address of a different addressKind', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();

      await banAddressesRepository.remove(refId, AddressKinds.Owner);

      const row = await kysely
        .selectFrom('banAddresses')
        .selectAll('banAddresses')
        .where('refId', '=', refId)
        .where('addressKind', '=', AddressKinds.Housing)
        .executeTakeFirst();
      expect(row).toBeDefined();
    });
  });
});
