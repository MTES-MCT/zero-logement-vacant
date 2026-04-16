import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import {
  Owners,
  OwnerRecordDBO,
  ownerTable
} from '~/repositories/ownerRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { OwnerChange } from '~/scripts/import-lovac/source-owners/source-owner-transform';

const logger = createLogger('createOwnerLoader');

const CHUNK_SIZE = 1_000;
const UPSERT_COLUMNS = [
  'full_name',
  'birth_date',
  'siren',
  'address_dgfip',
  'kind_class',
  'data_source',
  'updated_at'
] as const;

export interface OwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceOwner>;
}

export function createOwnerLoader(
  options: OwnerLoaderOptions
): WritableStream<OwnerChange> {
  const insertBuffer: OwnerRecordDBO[] = [];
  const upsertBuffer: OwnerRecordDBO[] = [];

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} owners...`);
    await Owners().insert(batch);
    options.reporter.created(batch.length);
  }

  async function flushUpserts(): Promise<void> {
    if (upsertBuffer.length === 0) return;
    const batch = upsertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Upserting ${batch.length} owners...`);
    await db.transaction(async (trx) => {
      await trx(ownerTable)
        .insert(batch)
        .onConflict('idpersonne')
        .merge([...UPSERT_COLUMNS]);
    });
    options.reporter.updated(batch.length);
  }

  return new WritableStream<OwnerChange>({
    async write(change) {
      await match(change)
        .with({ kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ kind: 'update' }, async (c) => {
          upsertBuffer.push(c.value);
          if (upsertBuffer.length >= CHUNK_SIZE) await flushUpserts();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushInserts(), flushUpserts()]);
    }
  });
}
