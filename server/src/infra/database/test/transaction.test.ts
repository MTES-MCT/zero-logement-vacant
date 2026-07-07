import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { sql } from 'kysely';

import db from '~/infra/database/index';
import { getKyselyTransaction } from '~/infra/database/kysely-transaction';
import { getTransaction, startTransaction } from '~/infra/database/transaction';

describe('Transaction', () => {
  const tables = ['t1', 't2'];

  beforeAll(async () => {
    await async.forEach(tables, async (name) => {
      if (await db.schema.hasTable(name)) {
        await db.schema.dropTable(name);
      }

      await db.schema.createTable(name, (table) => {
        table.uuid('id').primary();
      });
    });
  });

  afterAll(async () => {
    await async.forEach(tables, async (name) => {
      await db.schema.dropTable(name);
    });
  });

  it('should correctly insert records', async () => {
    const record = { id: faker.string.uuid() };

    await startTransaction(async () => {
      const transaction = getTransaction();
      if (!transaction) {
        throw new Error('Transaction should be defined');
      }

      await async.forEach(tables, async (name) => {
        await transaction(name).insert(record);
      });
    });

    await async.forEach(tables, async (name) => {
      const actual = await db(name).where({ id: record.id }).first();
      expect(actual).toBeDefined();
    });
  });

  it('should roll back if one of the queries fails', async () => {
    const original = { id: faker.string.uuid() };
    await async.forEach(tables, async (name) => {
      await db(name).insert(original);
    });

    try {
      await startTransaction(async () => {
        const transaction = getTransaction();
        if (!transaction) {
          throw new Error('Transaction should be defined');
        }

        await transaction('t1').insert({ id: faker.string.uuid() });
        await transaction('t2').insert({ id: null });
      });
    } catch {
      await async.forEach(tables, async (name) => {
        const actual = await db(name).where({ id: original.id }).first();
        expect(actual).toBeDefined();
      });
    }
  });

  it('should handle multiple transactions', async () => {
    const records = Array.from({ length: 3 }, () => ({
      id: faker.string.uuid()
    }));

    await async.forEach(records, async (record) => {
      await startTransaction(async () => {
        const transaction = getTransaction();
        if (!transaction) {
          throw new Error('Transaction should be defined');
        }

        await transaction('t1').insert(record);
      });
    });

    const actual = await db('t1');
    expect(actual).toIncludeAllMembers(actual);
  });

  describe('cross-engine (Knex + Kysely)', () => {
    it('commits Knex and Kysely writes together', async () => {
      const knexId = faker.string.uuid();
      const kyselyId = faker.string.uuid();

      await startTransaction(async () => {
        const knexTrx = getTransaction();
        const kyselyTrx = getKyselyTransaction();
        if (!knexTrx || !kyselyTrx) {
          throw new Error('Both transactions should be defined');
        }
        await knexTrx('t1').insert({ id: knexId });
        await sql`insert into t2 (id) values (${kyselyId})`.execute(kyselyTrx);
      });

      const knexRow = await db('t1').where({ id: knexId }).first();
      const kyselyRow = await db('t2').where({ id: kyselyId }).first();
      expect(knexRow).toBeDefined();
      expect(kyselyRow).toBeDefined();
    });

    it('rolls back the Kysely write when the Knex write fails', async () => {
      const kyselyId = faker.string.uuid();

      await expect(
        startTransaction(async () => {
          const knexTrx = getTransaction();
          const kyselyTrx = getKyselyTransaction();
          if (!knexTrx || !kyselyTrx) {
            throw new Error('Both transactions should be defined');
          }
          await sql`insert into t2 (id) values (${kyselyId})`.execute(kyselyTrx);
          // Violates NOT NULL on the primary key → aborts the unit.
          await knexTrx('t1').insert({ id: null });
        })
      ).rejects.toThrow();

      const kyselyRow = await db('t2').where({ id: kyselyId }).first();
      expect(kyselyRow).toBeUndefined();
    });

    it('rolls back the Knex write when the Kysely write fails', async () => {
      const knexId = faker.string.uuid();

      await expect(
        startTransaction(async () => {
          const knexTrx = getTransaction();
          const kyselyTrx = getKyselyTransaction();
          if (!knexTrx || !kyselyTrx) {
            throw new Error('Both transactions should be defined');
          }
          await knexTrx('t1').insert({ id: knexId });
          await sql`insert into t2 (id) values (${null})`.execute(kyselyTrx);
        })
      ).rejects.toThrow();

      const knexRow = await db('t1').where({ id: knexId }).first();
      expect(knexRow).toBeUndefined();
    });
  });
});
