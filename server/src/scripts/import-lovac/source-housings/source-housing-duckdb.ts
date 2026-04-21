import { DuckDBInstance } from '@duckdb/node-api';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createLogger } from '~/infra/logger';

const logger = createLogger('sourceHousingDuckdb');

export interface PrepareOptions {
  sourceFile: string;
  pgUrl: string;
  workDir?: string;
}

export interface PrepareResult {
  changesFile: string;
  deptsDir: string;
}

export async function prepareHousingImport(
  options: PrepareOptions
): Promise<PrepareResult> {
  for (const [name, value] of [
    ['pgUrl', options.pgUrl],
    ['sourceFile', options.sourceFile],
  ] as const) {
    if (value.includes("'")) {
      throw new Error(
        `prepareHousingImport: ${name} must not contain single quotes`
      );
    }
  }

  const workDir =
    options.workDir ??
    fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-lovac-'));
  const changesFile = path.join(workDir, 'geo_code_changes.parquet');
  const deptsDir = path.join(workDir, 'depts');
  fs.mkdirSync(deptsDir, { recursive: true });

  logger.info('Starting DuckDB prepare step...', {
    sourceFile: options.sourceFile,
    workDir,
  });

  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();

  try {
    await connection.run(`INSTALL postgres; LOAD postgres;`);
    await connection.run(
      `ATTACH '${options.pgUrl}' AS pg (TYPE POSTGRES);`
    );

    logger.info('Loading source file into DuckDB temp table...');
    await connection.run(`
      CREATE TEMP TABLE source AS
        SELECT * FROM read_json_auto('${options.sourceFile}');
    `);

    const countReader = await connection.runAndReadAll(
      `SELECT COUNT(*)::BIGINT AS n FROM source`
    );
    const total = (countReader.getRowObjects()[0] as { n: bigint }).n;
    logger.info(`Source rows: ${total}`);

    logger.info('Detecting geo_code changes...');
    await connection.run(`
      COPY (
        SELECT h.id, s.geo_code AS new_geo_code
        FROM pg.fast_housing h
        JOIN source s ON h.local_id = s.local_id
        WHERE h.geo_code != s.geo_code
      ) TO '${changesFile}' (FORMAT PARQUET);
    `);

    const changesReader = await connection.runAndReadAll(
      `SELECT COUNT(*)::BIGINT AS n FROM read_parquet('${changesFile}')`
    );
    const changesCount = (changesReader.getRowObjects()[0] as { n: bigint }).n;
    logger.info(`Geo_code changes detected: ${changesCount}`);

    logger.info('Splitting source by department...');
    await connection.run(`
      COPY (
        SELECT *, geo_code[1:2] AS dept
        FROM source
      ) TO '${deptsDir}' (FORMAT PARQUET, PARTITION_BY (dept), OVERWRITE_OR_IGNORE);
    `);

    const deptCount = fs.readdirSync(deptsDir).length;
    logger.info(`Split into ${deptCount} department files.`);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }

  return { changesFile, deptsDir };
}
