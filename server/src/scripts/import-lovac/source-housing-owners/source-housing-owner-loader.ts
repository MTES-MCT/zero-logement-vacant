import { isActiveOwnerRank } from '@zerologementvacant/models';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingOwnerEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceHousingOwner } from './source-housing-owner';
import { HousingOwnerChange } from './source-housing-owner-transform';

const logger = createLogger('createHousingOwnerLoader');

const EVENT_CHUNK_SIZE = 1_000;
const REPLACE_CHUNK_SIZE = 500;

export interface HousingOwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceHousingOwner>;
  /**
   * If provided, every owner_id touched by a replace is added to this set
   * so the caller can refresh derived owner-level flags (e.g.
   * `is_multi_owner`) once the stream drains. The set is shared across
   * parallel loader instances safely — Set.add is atomic on Node's
   * single-threaded event loop.
   */
  affectedOwnerIds?: Set<string>;
}

export function createHousingOwnerLoader(
  options: HousingOwnerLoaderOptions
): WritableStream<HousingOwnerChange> {
  const eventBuffer: HousingOwnerEventApi[] = [];
  const replaceBuffer: ReadonlyArray<HousingOwnerDBO>[] = [];

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing-owner events...`);
    await eventRepository.insertManyHousingOwnerEvents(batch);
  }

  async function flushReplaces(): Promise<void> {
    if (replaceBuffer.length === 0) return;
    const batch = replaceBuffer.splice(0);
    if (options.dryRun) return;

    const housingKeys = batch.map((rows) => [
      rows[0].housing_geo_code,
      rows[0].housing_id
    ]);
    const allRows = batch.flatMap((rows) => [...rows]);

    logger.debug(
      `Replacing housing owners across ${housingKeys.length} housings (${allRows.length} new rows)...`
    );
    await withinTransaction(async (transaction) => {
      await HousingOwners(transaction)
        .whereIn(['housing_geo_code', 'housing_id'], housingKeys)
        .delete();
      if (allRows.length > 0) {
        await HousingOwners(transaction).insert(allRows);
      }
    });
    const activeCount = allRows.filter((row) => isActiveOwnerRank(row.rank)).length;
    options.reporter.created(activeCount);
    options.reporter.updated(allRows.length - activeCount);
  }

  return new WritableStream<HousingOwnerChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housingOwners', kind: 'replace' }, async (c) => {
          if (c.value.length === 0) return;
          if (options.affectedOwnerIds) {
            for (const row of c.value) {
              options.affectedOwnerIds.add(row.owner_id);
            }
          }
          replaceBuffer.push(c.value);
          if (replaceBuffer.length >= REPLACE_CHUNK_SIZE) {
            await flushReplaces();
          }
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= EVENT_CHUNK_SIZE) {
            await flushEvents();
          }
        })
        .exhaustive();
    },
    async close() {
      await flushReplaces();
      await flushEvents();
    }
  });
}
