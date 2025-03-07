import { AsyncLocalStorage } from 'async_hooks';
import { Knex } from 'knex';
import { AsyncOrSync } from 'ts-essentials';

import db from '~/infra/database/index';

interface TransactionStore {
  transaction: Knex.Transaction;
}

const storage: AsyncLocalStorage<TransactionStore> =
  new AsyncLocalStorage<TransactionStore>();

export async function startTransaction(
  cb: () => AsyncOrSync<void>,
  options?: Knex.TransactionConfig
) {
  const transaction = await db.transaction(options);
  try {
    await storage.run({ transaction }, cb);
    await transaction.commit();
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
