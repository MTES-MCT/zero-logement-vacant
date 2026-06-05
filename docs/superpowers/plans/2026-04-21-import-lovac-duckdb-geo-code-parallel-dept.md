# Import LOVAC Housings — DuckDB Geo-Code Detection & Parallel Dept Import

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slow in-memory A-B-C geo-code detection loop with a single DuckDB pass (detect changes + split by dept into parquet), then parallelise per-dept imports.

**Architecture:** One DuckDB pass reads the source JSONL, detects geo_code changes by JOINing with `pg.fast_housing` (all partitions, catching cross-dept moves), and writes `geo_code_changes.parquet` + hive-partitioned per-dept parquet files. Node.js then applies geo_code corrections sequentially (PostgreSQL v11+ moves rows between partitions on UPDATE automatically), and imports per-dept parquet files in parallel via `async.mapLimit`.

**Tech Stack:** `@duckdb/node-api`, DuckDB postgres extension, Knex, `async`, existing EETL pipeline (Validate→Enrich→Transform→Load).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts` | **Create** | DuckDB prepare step: detect geo_code changes + split by dept |
| `server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.ts` | **Create** | Read a single per-dept parquet file as `SourceRepository<SourceHousing>` |
| `server/src/scripts/import-lovac/source-housings/source-housing-command.ts` | **Modify** | Orchestrate new pipeline; remove A-B-C; add parallel import |

---

### Task 1: Install `@duckdb/node-api`

**Files:**
- Modify: `server/package.json` (via yarn)

- [ ] **Step 1: Add dependency**

```bash
yarn workspace @zerologementvacant/server add @duckdb/node-api
```

- [ ] **Step 2: Verify**

```bash
grep '@duckdb/node-api' server/package.json
```

Expected: version line present.

- [ ] **Step 3: Commit**

```bash
git add server/package.json yarn.lock
git commit -m "chore(server): add @duckdb/node-api dependency"
```

---

### Task 2: Create `source-housing-duckdb.ts`

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts`
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts`

One exported function `prepareHousingImport` that:
1. Attaches a PostgreSQL DB via the DuckDB postgres extension
2. Loads the source JSONL into a DuckDB temp table (single read)
3. Writes `geo_code_changes.parquet` — rows where `fast_housing.geo_code != source.geo_code`, identified by `local_id`. Queries the **parent** `fast_housing` table to catch cross-department moves.
4. Writes per-dept parquet files via hive partitioning into `${workDir}/depts/`. DuckDB excludes the partition column (`dept`) from the actual file data, so the files contain exactly the original source schema.

Returns `{ changesFile: string; deptsDir: string }`.

- [ ] **Step 1: Write the failing test**

Create `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts`:

```typescript
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
    // Minimal LOVAC rows — only fields needed for the DuckDB step
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
    // Read back with DuckDB to verify schema
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
      await conn.close();
      await instance.close();
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn nx test server -- source-housing-duckdb
```

Expected: FAIL — `Cannot find module './source-housing-duckdb'`

- [ ] **Step 3: Implement `source-housing-duckdb.ts`**

```typescript
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
    await connection.close();
    await instance.close();
  }

  return { changesFile, deptsDir };
}
```

- [ ] **Step 4: Run tests**

```bash
yarn nx test server -- source-housing-duckdb
```

Expected: PASS (requires running PG with test DB migrated — `DATABASE_URL` env var or default `localhost:5432/test`)

- [ ] **Step 5: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts \
        server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts
git commit -m "feat(server): add DuckDB prepare step for geo_code detection and dept split"
```

---

### Task 3: Create `source-housing-parquet-repository.ts`

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.ts`
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.test.ts`

Implements `SourceRepository<SourceHousing>`. Uses `@duckdb/node-api` to read a per-dept parquet file and return a `ReadableStream<SourceHousing>`. Note: the `StreamOptions.departments` filter is unused — each file already contains exactly one department.

`runAndReadAll` loads one dept's rows into memory. Dept files are bounded (≤ ~200k rows per dept), so this is acceptable.

- [ ] **Step 1: Write the failing test**

Create `server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.test.ts`:

```typescript
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
      // Write a minimal parquet file with the two fields we care about
      await conn.run(`
        COPY (
          SELECT 'L001' AS local_id, '75056' AS geo_code
        ) TO '${parquetFile}' (FORMAT PARQUET);
      `);
    } finally {
      await conn.close();
      await instance.close();
    }
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('streams rows from a parquet file', async () => {
    const repo = createParquetSourceHousingRepository(parquetFile);
    const rows: unknown[] = [];
    await repo.stream().pipeTo(
      new WritableStream({ write: (row) => { rows.push(row); } })
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn nx test server -- source-housing-parquet-repository
```

Expected: FAIL — `Cannot find module './source-housing-parquet-repository'`

- [ ] **Step 3: Implement `source-housing-parquet-repository.ts`**

```typescript
import { DuckDBInstance } from '@duckdb/node-api';
import { ReadableStream } from 'node:stream/web';

import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from './source-housing';

class ParquetSourceHousingRepository
  implements SourceRepository<SourceHousing>
{
  constructor(private readonly filePath: string) {}

  stream(_options?: StreamOptions): ReadableStream<SourceHousing> {
    const { filePath } = this;

    return new ReadableStream<SourceHousing>({
      async start(controller) {
        const instance = await DuckDBInstance.create(':memory:');
        const connection = await instance.connect();
        try {
          const reader = await connection.runAndReadAll(
            `SELECT * FROM read_parquet(?)`,
            [filePath]
          );
          for (const row of reader.getRowObjects()) {
            controller.enqueue(row as SourceHousing);
          }
        } finally {
          await connection.close();
          await instance.close();
          controller.close();
        }
      }
    });
  }
}

export function createParquetSourceHousingRepository(
  filePath: string
): SourceRepository<SourceHousing> {
  return new ParquetSourceHousingRepository(filePath);
}
```

- [ ] **Step 4: Run tests**

```bash
yarn nx test server -- source-housing-parquet-repository
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.ts \
        server/src/scripts/import-lovac/source-housings/source-housing-parquet-repository.test.ts
git commit -m "feat(server): add parquet source repository for per-dept housing files"
```

---

### Task 4: Refactor `source-housing-command.ts`

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`

Replace the three-pass A-B-C geo-code loop and the single sequential second pass with:
1. DuckDB prepare step (`prepareHousingImport`)
2. Sequential geo-code correction via Knex temp table UPDATE on parent `fast_housing`
3. Parallel per-dept import with `async.mapLimit(CONCURRENCY = 4)`

Note on S3: the DuckDB step requires a local file. When `options.from === 's3'`, the file must be downloaded first. This task adds a `downloadIfS3` helper using the existing `createS3` utility.

- [ ] **Step 1: Add `downloadIfS3` helper**

Add to `source-housing-command.ts` (below imports):

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';

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
```

- [ ] **Step 2: Add `applyGeoCodeChanges` helper**

Add to `source-housing-command.ts`:

```typescript
import { DuckDBInstance } from '@duckdb/node-api';

async function applyGeoCodeChanges(changesFile: string): Promise<void> {
  // Read changes from parquet
  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();
  let changes: Array<{ id: string; new_geo_code: string }> = [];
  try {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_parquet(?)`,
      [changesFile]
    );
    changes = reader.getRowObjects() as Array<{ id: string; new_geo_code: string }>;
  } finally {
    await connection.close();
    await instance.close();
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
    // Insert in chunks to stay well within pg parameter limits
    for (let i = 0; i < changes.length; i += 1_000) {
      await db(tmpTable).insert(changes.slice(i, i + 1_000));
    }
    // Single JOIN UPDATE — PostgreSQL v11+ moves rows between partitions
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
```

- [ ] **Step 3: Rewrite the command body**

Replace the entire `return async (file, options) => { ... }` function in `createSourceHousingCommand` with:

```typescript
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
      pgUrl: config.database.url,
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
        // Glob pattern: DuckDB handles multiple parquet files per partition
        const parquetGlob = path.join(deptsDir, deptDir, '*.parquet');
        logger.info(`[dept ${dept}] Starting import...`);

        await createParquetSourceHousingRepository(parquetGlob)
          .stream()
          .pipeThrough(
            validator(sourceHousingSchema, {
              abortEarly: options.abortEarly,
              reporter: sourceHousingReporter,
            })
          )
          .pipeThrough(createSourceHousingEnricher())
          .pipeThrough(
            map(
              createHousingTransform({
                abortEarly: options.abortEarly,
                adminUserId: auth.id,
                reporter: sourceHousingReporter,
                year: options.year,
              })
            )
          )
          .pipeThrough(flatten())
          .pipeTo(
            createHousingLoader({
              dryRun: options.dryRun,
              reporter: sourceHousingReporter,
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
```

Add new imports at the top of the file:

```typescript
import os from 'node:os';
import fs from 'node:fs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { DuckDBInstance } from '@duckdb/node-api';
import { prepareHousingImport } from './source-housing-duckdb';
import { createParquetSourceHousingRepository } from './source-housing-parquet-repository';
```

Remove the now-unused imports: `ReadableStream` (web stream, if only used for geo-code step), `List` from `immutable`, `HousingDBO`, `createUpdater`, `createSourceHousingRepository`.

- [ ] **Step 4: Typecheck**

```bash
yarn nx typecheck server
```

Fix any type errors before continuing.

- [ ] **Step 5: Run the full test suite for the source-housings module**

```bash
yarn nx test server -- source-housing
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-command.ts
git commit -m "refactor(server): replace geo-code A-B-C loop with DuckDB detect+split, parallel dept import"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| One DuckDB pass (detect + split) | Task 2 |
| Cross-dept geo_code moves handled (parent table JOIN) | Task 2 — `pg.fast_housing` (not per-dept) |
| Geo-code correction sequential | Task 4 `applyGeoCodeChanges` |
| PostgreSQL handles partition moves via UPDATE | Task 4 — single `UPDATE fast_housing` |
| Per-dept parquet files | Task 2 PARTITION_BY output |
| Parallel dept import | Task 4 `async.mapLimit(4)` |
| S3 source still supported | Task 4 `downloadIfS3` |
| Existing Validate→Enrich→Transform→Load pipeline unchanged | Task 3 + Task 4 |
| Logs at each stage | Tasks 2, 4 — `logger.info` throughout |

### Potential gaps

- **DuckDB parquet file naming**: ✅ Handled — `createParquetSourceHousingRepository` receives `path.join(deptsDir, deptDir, '*.parquet')`. DuckDB's `read_parquet()` accepts glob patterns natively, so multiple files per partition (`data_0.parquet`, `data_1.parquet`, …) are all read transparently.
- **Temp file cleanup**: The `localFile` downloaded from S3 and the `workDir` from `prepareHousingImport` are not cleaned up. Add cleanup in the `finally` block if disk space is a concern.
- **`options.departments` filter**: the old command supported filtering by dept via `--departments`. With the new parallel approach, this filter should skip dept dirs not in the list. Add a filter on `deptDirs` if this option is used.
