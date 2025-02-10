import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';

import db from '~/infra/database/index';
import { getTransaction, startTransaction } from '~/infra/database/transaction';

describe('Transaction', () => {
  const tables = ['t1', 't2'];
  const original = {
    id: faker.string.uuid()
  };

  beforeAll(async () => {
    await async.forEach(tables, async (name) => {
      if (await db.schema.hasTable(name)) {
        await db.schema.dropTable(name);
      }

      await db.schema.createTable(name, (table) => {
        table.uuid('id').primary();
      });

      await db(name).insert(original);
    });
  });

  afterAll(async () => {
    await async.forEach(tables, async (name) => {
      await db.schema.dropTable(name);
    });
  });

  it('should correctly update a record', async () => {
    const updated = { id: faker.string.uuid() };

    await startTransaction(async () => {
      const transaction = getTransaction();
      if (!transaction) {
        throw new Error('Transaction should be defined');
      }

      await async.forEach(tables, async (name) => {
        await transaction(name).update(updated);
      });
    });

    await async.forEach(tables, async (name) => {
      const actual = await db(name).first();
      expect(actual).toStrictEqual(updated);
    });
  });

  it('should roll back if one of the queries fails', async () => {
    try {
      await startTransaction(async () => {
        const transaction = getTransaction();
        if (!transaction) {
          throw new Error('Transaction should be defined');
        }

        await transaction('t1').update({ id: faker.string.uuid() });
        await transaction('t2').update({ id: 'should-fail' });
      });
    } catch {
      await async.forEach(tables, async (name) => {
        const actual = await db(name).first();
        expect(actual).toStrictEqual(original);
      });
    }
  });

  it('should handle multiple transactions', async () => {
    const updateds = Array.from({ length: 3 }, () => ({
      id: faker.string.uuid()
    }));

    await async.forEach(updateds, async (updated) => {
      await startTransaction(async () => {
        const transaction = getTransaction();
        if (!transaction) {
          throw new Error('Transaction should be defined');
        }

        await transaction('t1').update(updated);
      });
    });

    const actual = await db('t1').first();
    expect(updateds).toContainEqual(actual);
  });
});
