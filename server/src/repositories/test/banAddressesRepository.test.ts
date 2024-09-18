import { faker } from '@faker-js/faker/locale/fr';
import banAddressesRepository, {
  AddressDBO,
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import { genAddressApi, genHousingApi } from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import db from '~/infra/database';
import { AddressApi } from '~/models/AddressApi';
import { AddressKinds } from '@zerologementvacant/shared';

describe('BAN addresses repository', () => {
  describe('save', () => {
    it('should save a BAN address', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);

      await banAddressesRepository.save(address);

      const actual = await Addresses()
        .where({
          ref_id: refId,
          address_kind: AddressKinds.Housing
        })
        .first();
      expect(actual).toStrictEqual<AddressDBO>({
        ref_id: refId,
        address_kind: AddressKinds.Housing,
        ban_id: address.banId as string,
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
    });

    it('should update an existing BAN address', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);
      await Addresses().insert(formatAddressApi(address));
      const newAddress: AddressApi = genAddressApi(refId, AddressKinds.Housing);

      await banAddressesRepository.save(newAddress);

      const actual = await Addresses()
        .where({
          ref_id: refId,
          address_kind: AddressKinds.Housing
        })
        .first();
      expect(actual).toStrictEqual<AddressDBO>({
        ref_id: refId,
        address_kind: AddressKinds.Housing,
        ban_id: newAddress.banId as string,
        address: newAddress.label,
        house_number: newAddress.houseNumber,
        street: newAddress.street,
        postal_code: newAddress.postalCode,
        city: newAddress.city,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        score: newAddress.score,
        last_updated_at: newAddress.lastUpdatedAt
          ? new Date(newAddress.lastUpdatedAt)
          : undefined
      });
    });
  });

  describe('saveMany', () => {
    it('should save thousands of records', async () => {
      const housings = Array.from({ length: 2_000 }, genHousingApi);
      await db.batchInsert(
        'fast_housing',
        housings.map(formatHousingRecordApi)
      );
      const addresses = housings.map((housing) => {
        return genAddressApi(housing.id, AddressKinds.Housing);
      });

      await banAddressesRepository.saveMany(addresses);

      const actual = await Addresses().where({
        address_kind: AddressKinds.Housing
      });
      expect(actual.length).toBeGreaterThanOrEqual(addresses.length);
    }, 10_000);
  });

  describe('listAddressesToNormalize', () => {
    it('should list addresses to normalize', async () => {
      const housings = Array.from({ length: 3 }, genHousingApi);
      await Housing().insert(housings.map(formatHousingRecordApi));

      const actual = await banAddressesRepository.listAddressesToNormalize();

      expect(actual.length).toBeGreaterThanOrEqual(housings.length);
    });
  });
});
