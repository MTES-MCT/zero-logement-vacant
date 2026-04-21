import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { prepareHousingImport } from './source-housing-duckdb';

const PG_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/test';

describe('prepareHousingImport', () => {
  let workDir: string;
  let sourceFile: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-duckdb-test-'));
    sourceFile = path.join(workDir, 'source.jsonl');
    fs.writeFileSync(
      sourceFile,
      [
        JSON.stringify({ local_id: 'TEST_L001', geo_code: '75056' }),
        JSON.stringify({ local_id: 'TEST_L002', geo_code: '69123' }),
      ].join('\n')
    );
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('writes a geo_code_changes.parquet file', async () => {
    const { changesFile } = await prepareHousingImport({
      sourceFile,
      pgUrl: PG_URL,
      workDir,
    });
    expect(fs.existsSync(changesFile)).toBe(true);
  });

  it('splits source into per-dept parquet files', async () => {
    const { deptsDir } = await prepareHousingImport({
      sourceFile,
      pgUrl: PG_URL,
      workDir,
    });
    const entries = fs.readdirSync(deptsDir);
    expect(entries.some((e) => e.startsWith('dept=75'))).toBe(true);
    expect(entries.some((e) => e.startsWith('dept=69'))).toBe(true);
  });

  it('geo_code_changes.parquet contains id and new_geo_code columns', async () => {
    const { changesFile } = await prepareHousingImport({
      sourceFile,
      pgUrl: PG_URL,
      workDir,
    });
    const instance = await DuckDBInstance.create(':memory:');
    const conn = await instance.connect();
    try {
      const reader = await conn.runAndReadAll(
        `SELECT * FROM read_parquet(?)`,
        [changesFile]
      );
      const cols = reader.columnNames();
      expect(cols).toContain('id');
      expect(cols).toContain('new_geo_code');
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });
});
