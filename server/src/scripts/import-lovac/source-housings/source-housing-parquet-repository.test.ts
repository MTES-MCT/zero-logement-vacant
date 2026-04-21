import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DuckDBInstance } from '@duckdb/node-api';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WritableStream } from 'node:stream/web';
import { createParquetSourceHousingRepository } from './source-housing-parquet-repository';

describe('createParquetSourceHousingRepository', () => {
  let workDir: string;
  let parquetFile: string;

  beforeEach(async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-parquet-test-'));
    parquetFile = path.join(workDir, 'test.parquet');

    const instance = await DuckDBInstance.create(':memory:');
    const conn = await instance.connect();
    try {
      await conn.run(`
        COPY (
          SELECT 'L001' AS local_id, '75056' AS geo_code
        ) TO '${parquetFile}' (FORMAT PARQUET);
      `);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('streams rows from a parquet file', async () => {
    const repo = createParquetSourceHousingRepository(parquetFile);
    const rows: unknown[] = [];
    await repo.stream().pipeTo(
      new WritableStream({
        write: (row) => {
          rows.push(row);
        }
      })
    );
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).local_id).toBe('L001');
    expect((rows[0] as Record<string, unknown>).geo_code).toBe('75056');
  });

  it('implements SourceRepository interface (stream() returns ReadableStream)', async () => {
    const repo = createParquetSourceHousingRepository(parquetFile);
    expect(repo.stream()).toBeInstanceOf(ReadableStream);
  });
});
