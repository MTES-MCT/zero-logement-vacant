import { AsyncLocalStorage } from 'async_hooks';
import { Knex } from 'knex';
import { AsyncOrSync } from 'ts-essentials';

import db from '~/infra/database/index';

interface TransactionStore {
  transaction: Knex.Transaction;
}

const storage: AsyncLocalStorage<TransactionStore> =
  new AsyncLocalStorage<TransactionStore>();

export async function startTransaction<R>(
  cb: () => AsyncOrSync<R>,
  options?: Knex.TransactionConfig
): Promise<R> {
  const transaction = await db.transaction(options);
  try {
    const result = await storage.run({ transaction }, cb);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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
