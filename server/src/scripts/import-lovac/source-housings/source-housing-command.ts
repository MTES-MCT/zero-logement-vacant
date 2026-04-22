import { createS3, flatten, map } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import async from 'async';
import fs from 'node:fs';
import path from 'node:path';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import {
  createMultiBar,
  multiProgress
} from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import { createSourceHousingEnricher } from '~/scripts/import-lovac/source-housings/source-housing-enricher';
import { createHousingTransform } from '~/scripts/import-lovac/source-housings/source-housing-transform';
import { createHousingLoader } from '~/scripts/import-lovac/source-housings/source-housing-loader';
import { createParquetSourceHousingRepository } from './source-housing-parquet-repository';

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

  return async (deptsDir: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import housings');
      logger.debug('Starting source housing command...', {
        deptsDir,
        options
      });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      // Disable building triggers
      logger.info('Disabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing DISABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_delete_building_trigger;
      `);

      // Discover per-dept parquet files, sorted by dept code
      const deptDirs = fs
        .readdirSync(deptsDir)
        .filter((d) => d.startsWith('dept='))
        .filter(
          (d) =>
            !options.departments?.length ||
            options.departments.includes(d.replace('dept=', ''))
        )
        .sort();

      logger.info(`Importing ${deptDirs.length} departments...`);

      const multi = createMultiBar();
      const CONCURRENCY = 4;
      await async.mapLimit(
        deptDirs,
        CONCURRENCY,
        async (deptDir: string) => {
          const dept = deptDir.replace('dept=', '');
          const parquetGlob = path.join(deptsDir, deptDir, '*.parquet');
          const repo = createParquetSourceHousingRepository(parquetGlob);
          const total = await repo.count();
          const bar = multi.create(total, 0, { dept });

          await repo
            .stream()
            .pipeThrough(multiProgress({ multiBar: multi, bar }))
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
                dept,
                dryRun: options.dryRun,
                reporter: sourceHousingReporter
              })
            );

        }
      );
      multi.stop();

      // Update building counts
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
      logger.info('Enabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing ENABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_delete_building_trigger;
      `);

      sourceHousingReporter.report();
      await writeReport(deptsDir, options, sourceHousingReporter);
      console.timeEnd('Import housings');
    }
  };
}

async function writeReport(
  deptsDir: string,
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
            Key: `${deptsDir}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        fs.writeFileSync(
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
