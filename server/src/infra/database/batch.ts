import { Array } from 'effect';

// Matches Knex's batchInsert default chunk size. A transaction is bound to a
// single pg connection, so batches always run sequentially — this stays under
// Postgres's 65535 bind-parameter limit without any concurrency to configure.
const DEFAULT_BATCH_SIZE = 1000;

export async function runInBatches<T>(
  items: ReadonlyArray<T>,
  fn: (batch: T[]) => Promise<void>,
  batchSize = DEFAULT_BATCH_SIZE
): Promise<void> {
  for (const batch of Array.chunksOf(items, batchSize)) {
    await fn(batch);
  }
}
