import { Knex } from 'knex';
import fp from 'lodash/fp';
import path from 'node:path';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import eventRepository from '~/repositories/eventRepository';
import {
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { SourceHousing } from './source-housing';
import {
  HousingRecordInsert,
  SourceHousingChange
} from './source-housing-transform';

const logger = createLogger('createHousingLoader');

const CHUNK_SIZE = 1_000;
const TEMPORARY_TABLE = 'source_housing_updates_tmp';

export interface HousingLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceHousing>;
}

export function createHousingLoader(
  options: HousingLoaderOptions
): WritableStream<SourceHousingChange> {
  const insertBuffer: HousingRecordInsert[] = [];
  const eventBuffer: HousingEventApi[] = [];
  const addressBuffer: AddressApi[] = [];

  // Updates go through a temporary-table-based bulk updater (createUpdater handles its own chunking).
  const updateWriter = options.dryRun
    ? createUpdater<HousingRecordInsert>({
        destination: 'file',
        file: path.join(import.meta.dirname, 'source-housing-updates.jsonl')
      })
    : createUpdater<HousingRecordInsert>({
        destination: 'database',
        temporaryTable: TEMPORARY_TABLE,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings as ReadonlyArray<HousingRecordDBO>, {
            temporaryTable: TEMPORARY_TABLE
          });
        }
      });
  const updateWriterStream = updateWriter.getWriter();

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housings...`);
    await insertHousings(batch);
  }

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing events...`);
    await eventRepository.insertManyHousingEvents(batch);
  }

  async function flushAddresses(): Promise<void> {
    if (addressBuffer.length === 0) return;
    const batch = addressBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} addresses...`);
    await Addresses()
      .insert(batch.map(formatAddressApi))
      .onConflict(['ref_id', 'address_kind'])
      .ignore();
  }

  return new WritableStream<SourceHousingChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housing', kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ type: 'housing', kind: 'update' }, async (c) => {
          await updateWriterStream.write(stripReadOnlyFields(c.value));
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= CHUNK_SIZE) await flushEvents();
        })
        .with({ type: 'address', kind: 'create' }, async (c) => {
          addressBuffer.push(c.value);
          if (addressBuffer.length >= CHUNK_SIZE) await flushAddresses();
        })
        .with({ type: 'event', kind: 'update' }, async () => {})
        .with({ type: 'address', kind: 'update' }, async () => {})
        .exhaustive();
    },
    async close() {
      // Inserts must complete before events: housing_events has a FK to fast_housing.
      await flushInserts();
      await Promise.all([flushEvents(), flushAddresses(), updateWriterStream.close()]);
    }
  });
}

async function insertHousings(
  housings: ReadonlyArray<HousingRecordInsert>
): Promise<void> {
  await Housing().insert(housings as ReadonlyArray<HousingRecordDBO>);
}

interface UpdateHousingsOptions {
  temporaryTable: string;
  keys?: ReadonlyArray<keyof HousingRecordDBO>;
}

export async function updateHousings(
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
  const updates: Record<string, Knex.Ref<string, any>> = fp.fromPairs(
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

function stripReadOnlyFields(housing: HousingRecordInsert): HousingRecordInsert {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    last_mutation_type,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    occupancy_history,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    plot_area,
    ...rest
  } = housing as unknown as HousingRecordDBO;
  return rest as HousingRecordInsert;
}
