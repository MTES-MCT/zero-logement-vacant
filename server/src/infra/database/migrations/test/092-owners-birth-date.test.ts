import { faker } from '@faker-js/faker/locale/fr';
import { v4 as uuidv4 } from 'uuid';

import createMigrator from './migrator';
import db from '~/infra/database/';

describe('092 Owners birth date', () => {
  const rollbackAll = true;
  const owners = [
    {
      id: uuidv4(),
      raw_address: [faker.location.streetAddress(true)],
      full_name: faker.person.fullName(),
      administrator: undefined,
      birth_date: new Date('2000-01-01T00:00:00Z'),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      owner_kind: 'PERSONNE PHYSIQUE',
      owner_kind_detail: 'PERSONNE PHYSIQUE',
    },
    {
      id: uuidv4(),
      raw_address: [faker.location.streetAddress(true)],
      full_name: faker.person.fullName(),
      administrator: undefined,
      birth_date: new Date('1990-01-01T00:00:00Z'),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      owner_kind: 'PERSONNE PHYSIQUE',
      owner_kind_detail: 'PERSONNE PHYSIQUE',
    }
  ];

  beforeEach(async () => {
    const migrator = createMigrator(db);
    await migrator.rollback(undefined, rollbackAll);
    await migrator.migrateUntil('092-owners-birth-date.ts');

    // Create some owners
    await db('owners').insert(owners);

    // Migrate the actual file
    await migrator.up();
  });

  describe('up', () => {
    it('should migrate the birth date from Date to Datetime', async () => {
      const ids = owners.map((owner) => owner.id);

      const actual = await db('owners').whereIn('id', ids);

      expect(actual).toIncludeAllPartialMembers([
        { birth_date: new Date('2000-01-01'), },
        { birth_date: new Date('1990-01-01'), }
      ]);
    });
  });

  describe('down', () => {
    beforeEach(async () => {
      await createMigrator(db).down();
    });

    it('should rollback the birth date', async () => {
      const ids = owners.map((owner) => owner.id);

      const actual = await db('owners').whereIn('id', ids);

      expect(actual).toIncludeAllPartialMembers([
        { birth_date: new Date(2000, 0, 1), },
        { birth_date: new Date(1990, 0, 1), }
      ]);
    });
  });
});
