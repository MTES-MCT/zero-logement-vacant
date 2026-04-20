import { isNotNull } from '@zerologementvacant/utils';
import {
  count,
  createS3,
  filter,
  flatten,
  map
} from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import async from 'async';
import { List } from 'immutable';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  HousingDBO,
  housingTable,
  parseHousingApi
} from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import { createSourceHousingEnricher } from '~/scripts/import-lovac/source-housings/source-housing-enricher';
import {
  createHousingTransform,
  HousingChange,
  HousingRecordInsert
} from '~/scripts/import-lovac/source-housings/source-housing-transform';
import { createHousingLoader } from '~/scripts/import-lovac/source-housings/source-housing-loader';
import { createSourceHousingRepository } from '~/scripts/import-lovac/source-housings/source-housing-repository';

const logger = createLogger('sourceHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceHousingCommand() {
  const sourceHousingReporter = createLoggerReporter<SourceHousing>();

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
            name: '(1/2) Updating housing geo codes'
          })
        )
        .pipeThrough(
          validator(
            sourceHousingSchema.pick({ geo_code: true, local_id: true }),
            {
              abortEarly: options.abortEarly,
              reporter: sourceHousingReporter
            }
          )
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
                    ...formatHousingRecordApi(housing),
                    geo_code: sourceHousing.geo_code
                  }
                }
              : null;
          })
        )
        .pipeThrough(filter(isNotNull))
        .pipeThrough(map((change) => change.value))
        .pipeTo(
          createUpdater<HousingRecordInsert>({
            destination: options.dryRun ? 'file' : 'database',
            file: path.join(
              import.meta.dirname,
              'housing-geo-code-updates.jsonl'
            ),
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
            name: '(2/2) Importing from LOVAC'
          })
        )
        .pipeThrough(
          validator(sourceHousingSchema, {
            abortEarly: options.abortEarly,
            reporter: sourceHousingReporter
          })
        )
        .pipeThrough(createSourceHousingEnricher())
        .pipeThrough(
          map(
            createHousingTransform({
              abortEarly: options.abortEarly,
              adminUserId: auth.id,
              reporter: sourceHousingReporter,
              year: options.year
            })
          )
        )
        .pipeThrough(flatten())
        .pipeTo(
          createHousingLoader({
            dryRun: options.dryRun,
            reporter: sourceHousingReporter
          })
        );
      logger.info(`File ${file} imported.`);

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
      await writeReport(file, options, sourceHousingReporter);
      console.timeEnd('Import housings');
    }
  };
}

export async function findOneHousing(
  geoCode: string,
  localId: string
): Promise<HousingApi | null> {
  const department = geoCode.slice(0, 2).toLowerCase();
  // Needed because the housing's locality we are trying to import
  // might have been removed, or merged with another locality.
  const housing = await db<HousingDBO>(`fast_housing_${department}`)
    .where({ local_id: localId })
    .first();
  return housing ? parseHousingApi(housing) : null;
}

async function writeReport(
  file: string,
  options: ExecOptions,
  reporter: Reporter<SourceHousing>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options)
      .with({ from: 's3' }, async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `${file}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        writeFileSync(
          `./import-lovac-${options.year}-housings.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
