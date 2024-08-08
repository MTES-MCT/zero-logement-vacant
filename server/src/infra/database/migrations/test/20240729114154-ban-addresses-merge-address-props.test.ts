import { faker } from '@faker-js/faker/locale/fr';

import createMigrator from '~/infra/database/migrations/test/migrator';
import db from '~/infra/database';
import { AddressKinds } from '@zerologementvacant/models';

describe('20240729114154-ban-addresses-merge-address-props', () => {
  const rollbackAll = true;
  const migrator = createMigrator(db);

  beforeEach(async () => {
    await migrator.rollback(undefined, rollbackAll);
    await migrator.migrateUntil(
      '20240729114154-ban-addresses-merge-address-props.ts'
    );
  });

  afterEach(async () => {
    await migrator.rollback(undefined, rollbackAll);
  });

  describe('up', () => {
    it.each`
      houseNumber | street                    | postalCode | city          | expected
      ${'1'}      | ${'rue Bidon'}            | ${'75101'} | ${'Paris'}    | ${'1 rue Bidon 75101 Paris'}
      ${null}     | ${'Chemin des Violettes'} | ${'63450'} | ${'Chanonat'} | ${'Chemin des Violettes 63450 Chanonat'}
      ${''}       | ${'Chemin des Violettes'} | ${'63450'} | ${'Chanonat'} | ${'Chemin des Violettes 63450 Chanonat'}
    `(
      'should merge $houseNumber, $street, $postalCode and $city into $expected',
      async ({ houseNumber, street, postalCode, city, expected }) => {
        const address = {
          ref_id: faker.string.uuid(),
          address_kind: AddressKinds.Housing,
          house_number: houseNumber,
          street: street,
          postal_code: postalCode,
          city: city,
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          last_updated_at: faker.date.recent()
        };
        await db('ban_addresses').insert(address);

        await migrator.up();

        const actual = await db('ban_addresses')
          .where({ ref_id: address.ref_id, address_kind: AddressKinds.Housing })
          .first();
        expect(actual).toBeDefined();
        expect(actual.address).toBe(expected);
      }
    );

    it('should update a large table', async () => {
      const addresses = Array.from({ length: 99_999 }, () => {
        return {
          ref_id: faker.string.uuid(),
          address_kind: AddressKinds.Housing,
          house_number: faker.location.buildingNumber(),
          street: faker.location.street(),
          postal_code: faker.location.zipCode(),
          city: faker.location.city(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          last_updated_at: faker.date.recent()
        };
      });
      await db.batchInsert('ban_addresses', addresses);

      await migrator.up();

      const actual = await db('ban_addresses').whereNull('address');
      expect(actual).toHaveLength(0);
    }, 60_000);
  });

  describe('down', () => {
    beforeEach(async () => {
      await migrator.up();
    });

    it('should remove the address column', async () => {
      const banAddress = {
        ref_id: faker.string.uuid(),
        address_kind: AddressKinds.Housing,
        address: faker.location.streetAddress({ useFullAddress: true }),
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        score: faker.number.float({ min: 0, max: 1 }),
        last_updated_at: faker.date.recent()
      };
      await db('ban_addresses').insert(banAddress);

      await migrator.down();

      const actual = await db('ban_addresses')
        .where({
          ref_id: banAddress.ref_id,
          address_kind: AddressKinds.Housing
        })
        .first();
      expect(actual).not.toHaveProperty('address');
    });
  });
});
