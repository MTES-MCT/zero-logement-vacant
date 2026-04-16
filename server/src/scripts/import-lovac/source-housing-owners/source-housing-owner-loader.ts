import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingEventApi, HousingOwnerEventApi } from '~/models/EventApi';
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

export interface HousingOwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceHousingOwner>;
}

export function createHousingOwnerLoader(
  options: HousingOwnerLoaderOptions
): WritableStream<HousingOwnerChange> {
  const eventBuffer: HousingOwnerEventApi[] = [];

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing-owner events...`);
    await eventRepository.insertManyHousingEvents(batch as unknown as HousingEventApi[]);
  }

  async function replaceHousingOwners(
    housingOwners: ReadonlyArray<HousingOwnerDBO>
  ): Promise<void> {
    if (housingOwners.length === 0 || options.dryRun) return;
    const housingGeoCode = housingOwners[0].housing_geo_code;
    const housingId = housingOwners[0].housing_id;
    await withinTransaction(async (transaction) => {
      await HousingOwners(transaction)
        .where({
          housing_geo_code: housingGeoCode,
          housing_id: housingId
        })
        .delete();
      await HousingOwners(transaction).insert(housingOwners as HousingOwnerDBO[]);
    });
  }

  return new WritableStream<HousingOwnerChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housingOwners', kind: 'replace' }, async (c) => {
          await replaceHousingOwners(c.value);
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
      await flushEvents();
    }
  });
}
