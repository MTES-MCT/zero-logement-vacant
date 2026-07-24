import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';

import db from '~/infra/database/index';
import { withinTransaction } from '~/infra/database/transaction';

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

    await withinTransaction(async (transaction) => {
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
      await withinTransaction(async (transaction) => {
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
      await withinTransaction(async (transaction) => {
        await transaction('t1').insert(record);
      });
    });

    const actual = await db('t1');
    expect(actual).toIncludeAllMembers(actual);
  });
});
