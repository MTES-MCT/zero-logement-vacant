import { isNotNull } from '@zerologementvacant/utils';
import {
  chunkify,
  count,
  filter,
  flatten,
  map
} from '@zerologementvacant/utils/node';
import async from 'async';
import { List } from 'immutable';
import { Knex } from 'knex';
import fp from 'lodash/fp';
import path from 'node:path';
import { WritableStream } from 'node:stream/web';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi, HousingId } from '~/models/HousingApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import eventRepository from '~/repositories/eventRepository';
import housingRepository, {
  formatHousingRecordApi,
  Housing,
  HousingDBO,
  HousingRecordDBO,
  housingTable,
  parseHousingApi
} from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import userRepository from '~/repositories/userRepository';
import {
  createHousingProcessor,
  HousingEventChange
} from '~/scripts/import-lovac/housings/housing-processor';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import {
  AddressChange,
  createSourceHousingProcessor,
  HousingChange
} from '~/scripts/import-lovac/source-housings/source-housing-processor';
import { createSourceHousingRepository } from '~/scripts/import-lovac/source-housings/source-housing-repository';

const logger = createLogger('sourceHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
}

export function createSourceHousingCommand() {
  const sourceHousingReporter = createLoggerReporter<SourceHousing>();
  const housingReporter = createLoggerReporter<HousingApi>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import housings');
      logger.debug('Starting source housing command...', { file, options });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      // Disable the building triggers
      logger.info('Disabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing DISABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_delete_building_trigger;
      `);

      const departments = options.departments ?? [];
      const total = await count(
        createSourceHousingRepository({
          ...config.s3,
          file: file,
          from: options.from
        }).stream({ departments })
      );

      // Update geo codes before importing
      await createSourceHousingRepository({
        ...config.s3,
        file: file,
        from: options.from
      })
        .stream({ departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total,
            name: '(1/3) Updating housing geo codes'
          })
        )
        .pipeThrough(
          validator(sourceHousingSchema.pick(['geo_code', 'local_id']), {
            abortEarly: options.abortEarly,
            reporter: sourceHousingReporter
          })
        )
        .pipeThrough(
          map<SourceHousing, HousingChange | null>(async (sourceHousing) => {
            const housing = await findOneHousing(
              sourceHousing.geo_code,
              sourceHousing.local_id
            );
            if (!housing) {
              return null;
            }

            return housing.geoCode !== sourceHousing.geo_code
              ? {
                  type: 'housing',
                  kind: 'update',
                  value: {
                    ...housing,
                    geoCode: sourceHousing.geo_code
                  }
                }
              : null;
          })
        )
        .pipeThrough(filter(isNotNull))
        .pipeThrough(map((change) => formatHousingRecordApi(change.value)))
        .pipeTo(
          createUpdater<HousingRecordDBO>({
            destination: options.dryRun ? 'file' : 'database',
            file: path.join(__dirname, 'housing-geo-code-updates.jsonl'),
            temporaryTable: 'housing_geo_code_updates_tmp',
            likeTable: housingTable,
            // Custom update because we cannot find housings
            // using their geo code, because it is to be replaced
            // by the new LOVAC
            async update(housings): Promise<void> {
              const temporaryTable = 'housing_geo_code_updates_tmp';
              const housingsByDepartment = List(housings).groupBy((housing) =>
                housing.geo_code.substring(0, 2)
              );
              const departments = housingsByDepartment.keySeq().toArray();
              await async.forEachSeries(departments, async (department) => {
                const departmentHousingTable = `${housingTable}_${department.toLowerCase()}`;
                await db(departmentHousingTable)
                  .update({
                    geo_code: db.ref(`${temporaryTable}.geo_code`)
                  })
                  .updateFrom(temporaryTable)
                  .where(
                    `${departmentHousingTable}.id`,
                    db.ref(`${temporaryTable}.id`)
                  )
                  .whereIn(
                    `${temporaryTable}.id`,
                    housings.map((housing) => housing.id)
                  );
              });
            }
          })
        );

      logger.info('Starting import...', { file });
      const stream = createSourceHousingRepository({
        ...config.s3,
        file: file,
        from: options.from
      })
        .stream({ departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total,
            name: '(2/3) Importing from LOVAC'
          })
        )
        .pipeThrough(
          validator(sourceHousingSchema, {
            abortEarly: options.abortEarly,
            reporter: sourceHousingReporter
          })
        )
        .pipeThrough(
          createSourceHousingProcessor({
            abortEarly: options.abortEarly,
            auth,
            reporter: sourceHousingReporter,
            housingRepository: {
              async findOne(
                geoCode: string,
                localId: string
              ): Promise<HousingApi | null> {
                return findOneHousing(geoCode, localId);
              }
            },
            housingEventRepository: {
              async find({
                id,
                geoCode
              }: HousingId): Promise<ReadonlyArray<HousingEventApi>> {
                const events = await eventRepository.find({
                  filters: {
                    types: [
                      'housing:created',
                      'housing:occupancy-updated',
                      'housing:status-updated'
                    ],
                    housings: [{ geoCode, id }]
                  }
                });
                return events.map((event) => ({
                  ...event,
                  housingId: id,
                  housingGeoCode: geoCode
                }));
              }
            },
            housingNoteRepository: {
              async find({
                id,
                geoCode
              }: HousingId): Promise<ReadonlyArray<HousingNoteApi>> {
                const notes = await noteRepository.findByHousing({
                  id,
                  geoCode
                });
                return notes.map((note: NoteApi) => ({
                  ...note,
                  housingId: id,
                  housingGeoCode: geoCode
                }));
              }
            }
          })
        )
        .pipeThrough(flatten());

      const [housingCreations, housingUpdates, addressUpdates, eventCreations] =
        stream
          .tee()
          .map((stream) => stream.tee())
          .flat();

      await Promise.all([
        housingCreations
          .pipeThrough(
            filter(
              (change) => change.type === 'housing' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream<ReadonlyArray<HousingApi>>({
              async write(housings) {
                if (!options.dryRun) {
                  await insertHousings(housings);
                }
              }
            })
          ),
        housingUpdates
          .pipeThrough(
            filter(
              (change): change is HousingChange =>
                change.type === 'housing' && change.kind === 'update'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(map(formatHousingRecordApi))
          .pipeTo(
            createUpdater<HousingRecordDBO>({
              destination: options.dryRun ? 'file' : 'database',
              file: path.join(__dirname, 'source-housing-updates.jsonl'),
              temporaryTable: 'source_housing_updates_tmp',
              likeTable: housingTable,
              async update(housings): Promise<void> {
                await updateHousings(housings, {
                  temporaryTable: 'source_housing_updates_tmp'
                });
              }
            })
          ),
        eventCreations
          .pipeThrough(
            filter(
              (change): change is HousingEventChange =>
                change.type === 'event' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream({
              async write(events) {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(events);
                }
              }
            })
          ),

        addressUpdates
          .pipeThrough(
            filter(
              (change): change is AddressChange =>
                change.type === 'address' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream({
              async write(addresses) {
                if (!options.dryRun) {
                  await Addresses()
                    .insert(addresses.map(formatAddressApi))
                    .onConflict(['ref_id', 'address_kind'])
                    .ignore();
                }
              }
            })
          )
      ]);
      logger.info(`File ${file} imported.`);

      logger.info('Checking for missing housings from the file...');
      const housingCount = await count(
        housingRepository.betterStream({
          filters: {}
          // For some reason, we cannot optimize by fetching
          // only vacant housing, excluding lovac-2025.
          // It seems to come from the `knex` package or `pg-query-stream`.
          // filters: {
          //   occupancies: [Occupancy.VACANT],
          //   dataFileYearsExcluded: ['lovac-2025']
          // },
          // includes: []
        })
      );
      const [housingUpdates2, eventCreations2] = housingRepository
        .betterStream({
          filters: {}
        })
        .pipeThrough(
          progress({
            initial: 0,
            total: housingCount,
            name: '(3/3) Updating housings missing from LOVAC'
          })
        )
        .pipeThrough(
          createHousingProcessor({
            auth,
            abortEarly: options.abortEarly,
            reporter: housingReporter
          })
        )
        .pipeThrough(flatten())
        .tee();

      await Promise.all([
        housingUpdates2
          .pipeThrough(
            filter(
              (change) => change.type === 'housing' && change.kind === 'update'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(map(formatHousingRecordApi))
          .pipeTo(
            createUpdater<HousingRecordDBO>({
              destination: options.dryRun ? 'file' : 'database',
              file: path.join(__dirname, 'housing-updates.jsonl'),
              temporaryTable: 'housing_updates_tmp',
              likeTable: housingTable,
              async update(housings): Promise<void> {
                await updateHousings(housings, {
                  temporaryTable: 'housing_updates_tmp'
                });
              }
            })
          ),
        eventCreations2
          .pipeThrough(
            filter(
              (change): change is HousingEventChange =>
                change.type === 'event' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream({
              async write(events) {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(events);
                }
              }
            })
          )
      ]);
      logger.info('Check done.');

      logger.info('Updating building counts...');
      await db.raw(`
        WITH building_counts AS (
          SELECT
            building_id,
            COUNT(*) FILTER (WHERE occupancy = 'L') as rent_count,
            COUNT(*) FILTER (WHERE occupancy = 'V') as vacant_count
          FROM fast_housing
          WHERE building_id IS NOT NULL
          GROUP BY building_id
        )
        UPDATE buildings b
        SET
          rent_housing_count = COALESCE(bc.rent_count, 0),
          vacant_housing_count = COALESCE(bc.vacant_count, 0)
          FROM building_counts bc
        WHERE b.id = bc.building_id
      `);
    } finally {
      // Re-enable the building triggers
      logger.info('Enabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing ENABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_delete_building_trigger;
      `);

      sourceHousingReporter.report();
      housingReporter.report();
      console.timeEnd('Import housings');
    }
  };
}

export async function findOneHousing(
  geoCode: string,
  localId: string
): Promise<HousingApi | null> {
  const department = geoCode.slice(0, 2).toLowerCase();
  // Needed because the housing’s locality we are trying to import
  // might have been removed, or merged with another locality.
  const housing = await db<HousingDBO>(`fast_housing_${department}`)
    .where({ local_id: localId })
    .first();
  return housing ? parseHousingApi(housing) : null;
}

export async function insertHousings(
  housings: ReadonlyArray<HousingApi>
): Promise<void> {
  await Housing().insert(housings.map(formatHousingRecordApi));
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
  // The keys to update in the housing table
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
        'deprecated_vacancy_reasons',
        'data_years',
        'data_file_years',
        'data_source',
        'beneficiary_count',
        'building_location',
        'rental_value',
        'condominium',
        'status',
        'sub_status',
        'deprecated_precisions',
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
