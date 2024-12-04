import db, { onConflict } from '~/infra/database';
import { faker } from '@faker-js/faker/locale/fr';

describe('Database utils', () => {
  const TEST_TABLE = 'test';

  interface TestEntity {
    id: string;
    a: string;
    b: number;
  }

  function Tests() {
    return db<TestEntity>(TEST_TABLE);
  }

  beforeAll(async () => {
    const tableExists = await db.schema.hasTable(TEST_TABLE);
    if (!tableExists) {
      await db.schema.createTable(TEST_TABLE, (table) => {
        table.uuid('id').primary().notNullable();
        table.string('a').notNullable();
        table.integer('b').notNullable();
      });
    }
  });

  afterAll(async () => {
    await db.schema.dropTableIfExists(TEST_TABLE);
  });

  describe('onConflict', () => {
    let entity: TestEntity;

    beforeEach(async () => {
      entity = {
        id: faker.string.uuid(),
        a: faker.string.sample(),
        b: faker.number.int({ max: 1000 })
      };
      await Tests().insert(entity);
    });

    it('should ignore conflicts if the merge option is false', async () => {
      await Tests()
        .insert({
          id: entity.id,
          a: faker.string.sample(),
          b: faker.number.int({ max: 1000 })
        })
        .modify(
          onConflict({
            onConflict: ['id'],
            merge: false
          })
        );

      const actual = await Tests().where({ id: entity.id }).first();
      expect(actual).toStrictEqual<TestEntity>(entity);
    });

    it('should fully update the entity if the merge option is true', async () => {
      const replacement: TestEntity = {
        id: entity.id,
        a: faker.string.sample(),
        b: faker.number.int({ max: 1000 })
      };

      await Tests()
        .insert(replacement)
        .modify(
          onConflict({
            onConflict: ['id'],
            merge: true
          })
        );

      const actual = await Tests().where({ id: entity.id }).first();
      expect(actual).toStrictEqual<TestEntity>(replacement);
    });

    it('should update the given properties if the merge option contains keys', async () => {
      const replacement: TestEntity = {
        id: entity.id,
        a: faker.string.sample(),
        b: faker.number.int({ max: 1000 })
      };

      await Tests()
        .insert(replacement)
        .modify(
          onConflict({
            onConflict: ['id'],
            merge: ['b']
          })
        );

      const actual = await Tests().where({ id: entity.id }).first();
      expect(actual).toStrictEqual<TestEntity>({
        id: entity.id,
        a: entity.a,
        b: replacement.b
      });
    });
  });
});
