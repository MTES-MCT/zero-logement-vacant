import { createS3, flatten, map } from '@zerologementvacant/utils/node';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import async from 'async';
import fs, { writeFileSync, createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { match } from 'ts-pattern';
import { DuckDBInstance } from '@duckdb/node-api';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import { createSourceHousingEnricher } from '~/scripts/import-lovac/source-housings/source-housing-enricher';
import { createHousingTransform } from '~/scripts/import-lovac/source-housings/source-housing-transform';
import { createHousingLoader } from '~/scripts/import-lovac/source-housings/source-housing-loader';
import { prepareHousingImport } from './source-housing-duckdb';
import { createParquetSourceHousingRepository } from './source-housing-parquet-repository';

const logger = createLogger('sourceHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

async function downloadIfS3(
  file: string,
  options: ExecOptions
): Promise<string> {
  if (options.from === 'file') return file;

  const tmpFile = path.join(
    os.tmpdir(),
    `lovac-${path.basename(file)}-${Date.now()}.jsonl`
  );
  logger.info(`Downloading source file from S3 to ${tmpFile}...`);
  const s3 = createS3(config.s3);
  const response = await s3.send(
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: file })
  );
  await pipeline(
    response.Body as Readable,
    createWriteStream(tmpFile)
  );
  logger.info('Download complete.');
  return tmpFile;
}

async function applyGeoCodeChanges(changesFile: string): Promise<void> {
  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();
  let changes: Array<{ id: string; new_geo_code: string }> = [];
  try {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_parquet(?)`,
      [changesFile]
    );
    changes = reader.getRowObjects() as Array<{
      id: string;
      new_geo_code: string;
    }>;
  } finally {
    connection.closeSync();
    instance.closeSync();
  }

  if (changes.length === 0) {
    logger.info('No geo_code changes to apply.');
    return;
  }

  logger.info(`Applying ${changes.length} geo_code changes...`);

  const tmpTable = 'housing_geo_code_changes_tmp';
  await db.schema.createTable(tmpTable, (t) => {
    t.uuid('id').notNullable();
    t.string('new_geo_code', 5).notNullable();
  });

  try {
    for (let i = 0; i < changes.length; i += 1_000) {
      await db(tmpTable).insert(changes.slice(i, i + 1_000));
    }
    await db.raw(`
      UPDATE fast_housing h
      SET geo_code = tmp.new_geo_code
      FROM ${tmpTable} tmp
      WHERE h.id = tmp.id
    `);
    logger.info(`Applied ${changes.length} geo_code changes.`);
  } finally {
    await db.schema.dropTableIfExists(tmpTable);
  }
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

      // Disable building triggers
      logger.info('Disabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing DISABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_delete_building_trigger;
      `);

      // Ensure we have a local file for DuckDB
      const localFile = await downloadIfS3(file, options);

      // 1. DuckDB: detect geo_code changes + split by dept (one pass)
      logger.info('Running DuckDB prepare step...');
      const { changesFile, deptsDir } = await prepareHousingImport({
        sourceFile: localFile,
        pgUrl: config.db.url
      });

      // 2. Apply geo_code corrections sequentially (cross-dept aware)
      await applyGeoCodeChanges(changesFile);

      // 3. Discover per-dept parquet files
      const deptDirs = fs
        .readdirSync(deptsDir)
        .filter((d) => d.startsWith('dept='));
      logger.info(`Importing ${deptDirs.length} departments...`);

      const CONCURRENCY = 4;
      await async.mapLimit(
        deptDirs,
        CONCURRENCY,
        async (deptDir: string) => {
          const dept = deptDir.replace('dept=', '');
          const parquetGlob = path.join(deptsDir, deptDir, '*.parquet');
          logger.info(`[dept ${dept}] Starting import...`);

          await createParquetSourceHousingRepository(parquetGlob)
            .stream()
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

          logger.info(`[dept ${dept}] Import complete.`);
        }
      );

      // 4. Update building counts (unchanged)
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
      await writeReport(file, options, sourceHousingReporter);
      console.timeEnd('Import housings');
    }
  };
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
