import { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';

type HousingRecordInsert = ReturnType<typeof formatHousingRecordApi>;
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { ExistingHousingChange } from './housing-transform';

const logger = createLogger('createExistingHousingLoader');

const EVENT_CHUNK_SIZE = 1_000;

export interface ExistingHousingLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<HousingApi>;
}

export function createExistingHousingLoader(
  options: ExistingHousingLoaderOptions
): WritableStream<ExistingHousingChange> {
  const eventBuffer: HousingEventApi[] = [];
  // Use a unique suffix to avoid table name conflicts when tests run in parallel.
  const temporaryTable = `existing_housing_updates_tmp_${randomUUID().replace(/-/g, '')}`;

  const updateWriter = options.dryRun
    ? createUpdater<HousingRecordInsert>({
        destination: 'file',
        file: path.join(import.meta.dirname, 'existing-housing-updates.jsonl')
      })
    : createUpdater<HousingRecordInsert>({
        destination: 'database',
        temporaryTable,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings as ReadonlyArray<HousingRecordDBO>, {
            temporaryTable
          });
          const ids = housings
            .map((h) => h.building_id)
            .filter((id) => id !== null);
          if (ids.length > 0) {
            await updateBuildingCounts(ids);
          }
        }
      });
  const updateWriterStream = updateWriter.getWriter();

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing events...`);
    await eventRepository.insertManyHousingEvents(batch);
  }

  return new WritableStream<ExistingHousingChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housing', kind: 'update' }, async (c) => {
          await updateWriterStream.write(formatHousingRecordApi(c.value));
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= EVENT_CHUNK_SIZE) await flushEvents();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushEvents(), updateWriterStream.close()]);
    }
  });
}

interface UpdateHousingsOptions {
  temporaryTable: string;
  keys?: ReadonlyArray<keyof HousingRecordDBO>;
}

async function updateHousings(
  housings: ReadonlyArray<HousingRecordDBO>,
  opts: UpdateHousingsOptions
): Promise<void> {
  const { temporaryTable } = opts;
  const keys: ReadonlyArray<keyof HousingRecordDBO> = opts.keys?.length
    ? opts.keys
    : [
        'invariant',
        'building_id',
        'building_group_id',
        'plot_id',
        'address_dgfip',
        'longitude_dgfip',
        'latitude_dgfip',
        'geolocation',
        'geolocation_source',
        'cadastral_classification',
        'uncomfortable',
        'vacancy_start_year',
        'housing_kind',
        'rooms_count',
        'living_area',
        'cadastral_reference',
        'building_year',
        'mutation_date',
        'last_mutation_date',
        'last_transaction_date',
        'last_transaction_value',
        'taxed',
        'data_years',
        'data_file_years',
        'data_source',
        'beneficiary_count',
        'building_location',
        'rental_value',
        'condominium',
        'status',
        'sub_status',
        'occupancy',
        'occupancy_source',
        'occupancy_intended',
        'energy_consumption_bdnb',
        'energy_consumption_at_bdnb'
      ];
  const updates: Record<string, Knex.Ref<string, any>> = Object.fromEntries(
    keys.map((key) => [key, db.ref(`${temporaryTable}.${key}`)])
  );

  await Housing()
    .update(updates)
    .updateFrom(temporaryTable)
    .where(`${housingTable}.geo_code`, db.ref(`${temporaryTable}.geo_code`))
    .where(`${housingTable}.id`, db.ref(`${temporaryTable}.id`))
    .whereIn(
      [`${temporaryTable}.geo_code`, `${temporaryTable}.id`],
      housings.map((housing) => [housing.geo_code, housing.id])
    );
}

async function updateBuildingCounts(
  buildingIds: ReadonlyArray<string>
): Promise<void> {
  await db.raw(
    `
    WITH building_counts AS (
      SELECT
        building_id,
        COUNT(*) FILTER (WHERE occupancy = 'L') as rent_count,
        COUNT(*) FILTER (WHERE occupancy = 'V') as vacant_count
      FROM fast_housing
      WHERE building_id = ANY(?)
      GROUP BY building_id
    )
    UPDATE buildings b
    SET
      rent_housing_count = COALESCE(bc.rent_count, 0),
      vacant_housing_count = COALESCE(bc.vacant_count, 0)
      FROM building_counts bc
    WHERE b.id = bc.building_id
    `,
    [buildingIds]
  );
}
