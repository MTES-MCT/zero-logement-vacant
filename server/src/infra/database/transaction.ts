import { AsyncLocalStorage } from 'async_hooks';

import { Knex } from 'knex';
import { AsyncOrSync } from 'ts-essentials';

import db from '~/infra/database/index';
import { kysely } from '~/infra/database/kysely';
import { runWithinKyselyTransaction } from '~/infra/database/kysely-transaction';

interface TransactionStore {
  transaction: Knex.Transaction;
}

const storage: AsyncLocalStorage<TransactionStore> =
  new AsyncLocalStorage<TransactionStore>();

export async function startTransaction<R>(
  cb: () => AsyncOrSync<R>,
  options?: Knex.TransactionConfig
): Promise<R> {
  // One logical transaction spanning both engines: a Knex transaction nested
  // inside a Kysely transaction. Both AsyncLocalStorage stores are seeded so
  // repos on either engine join this unit. Knex commits first; Kysely commits
  // as this callback resolves. Any error rolls back both.
  return kysely.transaction().execute(async (kyselyTransaction) => {
    const transaction = await db.transaction(options);
    let result: R;
    try {
      result = await storage.run({ transaction }, () =>
        runWithinKyselyTransaction(kyselyTransaction, async () => cb())
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await transaction.commit();
    return result;
  });
}

/**
 * Get the active transaction, if any.
 * {@link startTransaction} must be called before calling this function.
 */
export const getTransaction = () => storage.getStore()?.transaction;

/**
 * Get the active transaction or create a new one
 * and pass it to the callback.
 * @param cb
 * @param options
 */
export async function withinTransaction(
  cb: (transaction: Knex.Transaction) => AsyncOrSync<void>,
  options?: Knex.TransactionConfig
): Promise<void> {
  const transaction = getTransaction();
  if (transaction) {
    return cb(transaction);
  }

  await db.transaction(async (transaction) => {
    await cb(transaction);
  }, options);
}
