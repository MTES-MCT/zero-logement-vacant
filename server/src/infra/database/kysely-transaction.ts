import { AsyncLocalStorage } from 'async_hooks';
import type { Transaction } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';

interface KyselyTransactionStore {
  transaction: Transaction<DB>;
}

const storage = new AsyncLocalStorage<KyselyTransactionStore>();

export async function startKyselyTransaction<R>(
  cb: () => Promise<R>
): Promise<R> {
  return kysely.transaction().execute((trx) =>
    storage.run({ transaction: trx }, cb)
  );
}

export const getKyselyTransaction = (): Transaction<DB> | undefined =>
  storage.getStore()?.transaction;

export async function withinKyselyTransaction<R>(
  cb: (trx: Transaction<DB>) => Promise<R>
): Promise<R> {
  const trx = getKyselyTransaction();
  if (trx) return cb(trx);
  return kysely.transaction().execute(cb);
}
