# Extract Geo-Code Correction + Dept Split to DuckDB Shell Script

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the DuckDB geo-code detection/correction and dept-split preprocessing from Node.js into a standalone `prepare-housings.sh` DuckDB SQL script, then simplify the Node.js import command to only read pre-split parquet files.

**Architecture:** A pure DuckDB shell script (`prepare-housings.sh`) attaches to PostgreSQL, detects geo_code changes, applies them directly via `postgres_execute`, and splits source JSONL into per-dept parquet files. The Node.js `source-housing-command` then accepts a `deptsDir` path (output of the script) instead of a JSONL file, and runs the EETL pipeline in parallel. `source-housing-duckdb.ts` is deleted (logic moved to shell). The existing test is updated to write parquet fixtures directly via DuckDB.

**Tech Stack:** DuckDB CLI (postgres extension, `postgres_execute`), bash, `@duckdb/node-api` (parquet repository only), existing EETL pipeline.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/scripts/import-lovac/source-housings/prepare-housings.sh` | **Create** | DuckDB script: detect + apply geo_code changes, split by dept |
| `server/src/scripts/import-lovac/source-housings/source-housing-command.ts` | **Modify** | Accept `deptsDir`, remove DuckDB/S3 helpers |
| `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts` | **Modify** | Write parquet fixtures, remove geo_code change tests |
| `server/src/scripts/import-lovac/cli.ts` | **Modify** | Update `housings` subcommand argument from `<file>` to `<deptsDir>` |
| `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts` | **Delete** | Logic moved to shell script |
| `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts` | **Delete** | No longer needed |

---

### Task 1: Create `prepare-housings.sh`

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/prepare-housings.sh`

Follow the existing `import-buildings.sh` pattern.

- [ ] **Step 1: Write the script**

Create `server/src/scripts/import-lovac/source-housings/prepare-housings.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

FILE="${1:?Usage: $0 <source.jsonl> <pg_url> [work_dir]}"
PG_URL="${2:?Usage: $0 <source.jsonl> <pg_url> [work_dir]}"
WORK_DIR="${3:-$(mktemp -d /tmp/zlv-prepare-XXXXXX)}"
CHANGES_FILE="${WORK_DIR}/geo_code_changes.parquet"
DEPTS_DIR="${WORK_DIR}/depts"

mkdir -p "${DEPTS_DIR}"

echo "=== Prepare housings ==="
echo "Source:   ${FILE}"
echo "Work dir: ${WORK_DIR}"

duckdb :memory: <<SQL
INSTALL postgres;
LOAD postgres;
ATTACH '${PG_URL}' AS pg (TYPE POSTGRES);

-- 1. Load source JSONL
CREATE TEMP TABLE source AS
  SELECT * FROM read_json_auto('${FILE}');

SELECT COUNT(*)::BIGINT AS source_rows FROM source;

-- 2. Detect geo_code changes
CREATE TEMP TABLE changes AS
  SELECT h.id, s.geo_code AS new_geo_code
  FROM pg.fast_housing h
  JOIN source s ON h.local_id = s.local_id
  WHERE h.geo_code != s.geo_code;

SELECT COUNT(*)::BIGINT AS geo_code_changes FROM changes;

-- 3. Write changes parquet (for audit/report)
COPY changes TO '${CHANGES_FILE}' (FORMAT PARQUET);

-- 4. Apply geo_code corrections directly in PostgreSQL
CREATE TABLE pg.main.housing_geo_code_changes_tmp (
  id UUID NOT NULL,
  new_geo_code VARCHAR(5) NOT NULL
);

INSERT INTO pg.main.housing_geo_code_changes_tmp
  SELECT id, new_geo_code FROM changes;

CALL postgres_execute('pg', '
  UPDATE fast_housing h
  SET geo_code = tmp.new_geo_code
  FROM housing_geo_code_changes_tmp tmp
  WHERE h.id = tmp.id
');

CALL postgres_execute('pg', 'DROP TABLE IF EXISTS housing_geo_code_changes_tmp');

-- 5. Split source by department into hive-partitioned parquet
COPY (
  SELECT *, geo_code[1:2] AS dept
  FROM source
) TO '${DEPTS_DIR}' (FORMAT PARQUET, PARTITION_BY (dept), OVERWRITE_OR_IGNORE);

SQL

DEPT_COUNT=$(ls -d "${DEPTS_DIR}"/dept=* 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Done."
echo "  Geo-code changes applied (see ${CHANGES_FILE})"
echo "  Split into ${DEPT_COUNT} department files in ${DEPTS_DIR}"
echo ""
echo "Next: run the Node.js import command with:"
echo "  yarn workspace @zerologementvacant/server import-lovac housings '${DEPTS_DIR}' --from file --year <year>"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x server/src/scripts/import-lovac/source-housings/prepare-housings.sh
```

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/prepare-housings.sh
git commit -m "feat(server): add prepare-housings.sh DuckDB script for geo-code correction and dept split"
```

---

### Task 2: Simplify `source-housing-command.ts`

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`

Remove `downloadIfS3`, `applyGeoCodeChanges`, `prepareHousingImport` import. The `file` parameter becomes a `deptsDir` — the directory containing hive-partitioned parquet files (output of `prepare-housings.sh`). Keep `writeReport` unchanged.

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `server/src/scripts/import-lovac/source-housings/source-housing-command.ts` with:

```typescript
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

      // Discover per-dept parquet files
      const deptDirs = fs
        .readdirSync(deptsDir)
        .filter((d) => d.startsWith('dept='))
        .filter(
          (d) =>
            !options.departments?.length ||
            options.departments.includes(d.replace('dept=', ''))
        );
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
```

- [ ] **Step 2: Typecheck**

```bash
yarn nx typecheck server 2>&1 | grep "error TS" | grep -v "validator.test.ts"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-command.ts
git commit -m "refactor(server): simplify housing command to accept pre-split deptsDir"
```

---

### Task 3: Update CLI argument

**Files:**
- Modify: `server/src/scripts/import-lovac/cli.ts`

Change the `housings` subcommand argument from `<file>` (JSONL path) to `<deptsDir>` (path to hive-partitioned parquet directory).

- [ ] **Step 1: Update the CLI**

In `server/src/scripts/import-lovac/cli.ts`, change lines 59–73:

Replace:

```typescript
program
  .command('housings')
  .description('Import housings from a file to an existing database')
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(from)
  .addOption(year)
  .action(async (file, options) => {
    const command = createSourceHousingCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });
```

With:

```typescript
program
  .command('housings')
  .description(
    'Import housings from pre-split parquet files (output of prepare-housings.sh)'
  )
  .argument('<deptsDir>', 'Path to the hive-partitioned depts/ directory')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(from)
  .addOption(year)
  .action(async (deptsDir, options) => {
    const command = createSourceHousingCommand();
    await command(deptsDir, options).then(() => {
      process.exit();
    });
  });
```

- [ ] **Step 2: Typecheck**

```bash
yarn nx typecheck server 2>&1 | grep "error TS" | grep -v "validator.test.ts"
```

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/import-lovac/cli.ts
git commit -m "refactor(server): update housings CLI to accept deptsDir instead of JSONL file"
```

---

### Task 4: Update the command test

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts`

The test currently writes a JSONL file and relies on the command to handle geo_code detection internally. Now:
1. Write parquet files in hive-partitioned format (using DuckDB) instead of JSONL
2. Remove geo_code change assertions (that's `prepare-housings.sh`'s job now)
3. Pre-apply geo_code changes in the test DB setup (simulating `prepare-housings.sh` having run)
4. Call the command with the `deptsDir` path

- [ ] **Step 1: Rewrite the test**

Replace the full content of `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts` with:

```typescript
import { faker } from '@faker-js/faker/locale/fr';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { DuckDBInstance } from '@duckdb/node-api';
import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { ReadableStream } from 'node:stream/web';
import { BuildingApi } from '~/models/BuildingApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  EVENTS_TABLE,
  formatEventApi,
  formatHousingEventApi,
  HOUSING_EVENTS_TABLE,
  HousingEventDBO,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/source-housing-command';
import { updateHousings } from '~/scripts/import-lovac/source-housings/source-housing-loader';
import {
  genBuildingApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing command', () => {
  const command = createSourceHousingCommand();
  const deptsDir = path.join(import.meta.dirname, 'depts');

  const building: BuildingApi = genBuildingApi();

  const missingSourceHousings: ReadonlyArray<SourceHousing> =
    faker.helpers.multiple(
      () => ({
        ...genSourceHousing(),
        building_id: building.id
      }),
      {
        count: { min: 5, max: 50 }
      }
    );

  const vacantHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple<HousingApi>(
      () => ({
        ...genHousingApi(),
        buildingId: building.id,
        occupancy: Occupancy.VACANT,
        occupancyRegistered: Occupancy.VACANT
      }),
      { count: { min: 5, max: 50 } }
    );
  const nonVacantOccupancies = OCCUPANCY_VALUES.filter(
    (occupancy) => occupancy !== Occupancy.VACANT
  );
  const contactedStatuses = HOUSING_STATUS_VALUES.filter(
    (status) => status !== HousingStatus.NEVER_CONTACTED
  );
  const nonVacantUserModifiedHousings: ReadonlyArray<HousingApi> = faker.helpers
    .multiple(() => faker.helpers.arrayElement(nonVacantOccupancies), {
      count: { min: 5, max: 50 }
    })
    .map((occupancy) => ({
      ...genHousingApi(),
      buildingId: building.id,
      occupancy: occupancy,
      occupancyRegistered: occupancy,
      status: faker.helpers.arrayElement(contactedStatuses)
    }));
  const nonVacantNonUserModifiedHousings: ReadonlyArray<HousingApi> =
    faker.helpers
      .multiple(() => faker.helpers.arrayElement(nonVacantOccupancies), {
        count: { min: 5, max: 50 }
      })
      .map((occupancy) => ({
        ...genHousingApi(),
        buildingId: building.id,
        occupancy: occupancy,
        occupancyRegistered: occupancy,
        status: faker.helpers.arrayElement(contactedStatuses)
      }));

  // All housings that will appear in the source
  const sourceHousings: ReadonlyArray<SourceHousing> = [
    ...missingSourceHousings,
    ...vacantHousings.map(toSourceHousing),
    ...nonVacantUserModifiedHousings.map(toSourceHousing),
    ...nonVacantNonUserModifiedHousings.map(toSourceHousing)
  ];

  // Housings to save to the database
  const housingsBefore: ReadonlyArray<HousingApi> = [
    ...vacantHousings,
    ...nonVacantUserModifiedHousings,
    ...nonVacantNonUserModifiedHousings
  ];

  // Seed the database
  beforeAll(async () => {
    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));
    const user: UserApi = {
      ...genUserApi(establishment.id),
      email: 'not@an.admin'
    };
    const admin: UserApi = {
      ...genUserApi(establishment.id),
      email: `${faker.internet.userName().toLowerCase()}@zerologementvacant.beta.gouv.fr`
    };
    await Users().insert([user, admin].map(toUserDBO));
    await Buildings().insert(formatBuildingApi(building));
    await Housing().insert(housingsBefore.map(formatHousingRecordApi));

    // Insert the related events
    const events = nonVacantUserModifiedHousings.map<HousingEventApi>(
      (housing) => {
        return {
          ...genEventApi({
            type: 'housing:occupancy-updated',
            creator: user,
            nextOld: {
              occupancy: faker.helpers.arrayElement(OCCUPANCY_VALUES)
            },
            nextNew: {
              occupancy: housing.occupancy
            }
          }),
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        };
      }
    );
    await Events().insert(events.map(formatEventApi));
    await HousingEvents().insert(events.map(formatHousingEventApi));
  });

  // Write parquet files in hive-partitioned format and run command
  beforeAll(async () => {
    await writeParquetDepts(deptsDir, sourceHousings);
    await command(deptsDir, {
      abortEarly: true,
      from: 'file',
      year: 'lovac-2025'
    });
  });

  afterAll(async () => {
    await rm(deptsDir, { recursive: true, force: true });
  });

  it('should add "lovac-2025" to housing updated from LOVAC', async () => {
    const actual = await refresh([
      ...vacantHousings,
      ...nonVacantUserModifiedHousings,
      ...nonVacantNonUserModifiedHousings
    ]);
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      const years = housing.data_file_years as ReadonlyArray<string>;
      return years.includes('lovac-2025');
    });
  });

  it('should update specific housing keys', async () => {
    const table = faker.string.uuid();
    const housing = formatHousingRecordApi(genHousingApi());
    await Housing().insert(housing);
    const updated: Omit<HousingRecordDBO, 'last_mutation_type'> = {
      ...formatHousingRecordApi(genHousingApi()),
      id: housing.id,
      local_id: housing.local_id,
      geo_code: housing.geo_code,
      plot_area: null,
      occupancy_history: null
    };

    await ReadableStream.from([updated]).pipeTo(
      createUpdater<HousingRecordDBO>({
        destination: 'database',
        temporaryTable: table,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings, {
            temporaryTable: table
          });
        }
      })
    );

    const actual = await Housing()
      .where({ geo_code: housing.geo_code, id: housing.id })
      .first();
    const mutationDate = actual?.mutation_date
      ? new Date(actual.mutation_date)
          .toJSON()
          .substring(0, 'yyyy-mm-dd'.length)
      : null;
    const updatedMutationDate = updated.mutation_date
      ? new Date(updated.mutation_date)
          .toJSON()
          .substring(0, 'yyyy-mm-dd'.length)
      : null;
    expect(mutationDate).toBe(updatedMutationDate);
    expect(actual).toMatchObject<Partial<HousingRecordDBO>>({
      invariant: updated.invariant,
      building_id: updated.building_id,
      building_group_id: updated.building_group_id,
      plot_id: updated.plot_id,
      address_dgfip: updated.address_dgfip,
      longitude_dgfip: updated.longitude_dgfip,
      latitude_dgfip: updated.latitude_dgfip,
      geolocation: updated.geolocation,
      cadastral_classification: updated.cadastral_classification,
      uncomfortable: updated.uncomfortable,
      vacancy_start_year: updated.vacancy_start_year,
      housing_kind: updated.housing_kind,
      rooms_count: updated.rooms_count,
      living_area: updated.living_area,
      cadastral_reference: updated.cadastral_reference,
      building_year: updated.building_year,
      taxed: updated.taxed,
      data_years: updated.data_years,
      data_file_years: updated.data_file_years,
      data_source: updated.data_source,
      beneficiary_count: updated.beneficiary_count,
      building_location: updated.building_location,
      rental_value: updated.rental_value,
      condominium: updated.condominium,
      status: updated.status,
      sub_status: updated.sub_status,
      occupancy: updated.occupancy,
      occupancy_source: updated.occupancy_source,
      occupancy_intended: updated.occupancy_intended,
      energy_consumption_bdnb: updated.energy_consumption_bdnb,
      energy_consumption_at_bdnb: updated.energy_consumption_at_bdnb
    });
  });

  describe('Present in LOVAC, missing from our database', () => {
    let actual: ReadonlyArray<HousingRecordDBO>;

    beforeAll(async () => {
      actual = await Housing().whereIn(
        ['geo_code', 'local_id'],
        missingSourceHousings.map((sourceHousing) => [
          sourceHousing.geo_code,
          sourceHousing.local_id
        ])
      );
    });

    it('should import new housings', () => {
      expect(actual).toHaveLength(missingSourceHousings.length);
    });

    it('should set their occupancy to "vacant"', () => {
      expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
        return housing.occupancy === Occupancy.VACANT;
      });
    });

    it('should set their status to "never contacted"', () => {
      expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
        return housing.status === HousingStatus.NEVER_CONTACTED;
      });
    });
  });

  describe('Present in LOVAC, present in our database', () => {
    it('should leave vacant housings' occupancies and statuses untouched', async () => {
      const actual = await refresh(vacantHousings);
      expect(actual).toHaveLength(vacantHousings.length);
      actual.forEach((actualHousing) => {
        const housingBefore = housingsBefore.find(
          (housing) => housing.id === actualHousing.id
        );
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: housingBefore?.occupancy,
          occupancy_source: housingBefore?.occupancyRegistered,
          status: housingBefore?.status,
          sub_status: housingBefore?.subStatus
        });
      });
    });

    it('should leave non-vacant, user-modified housing occupancies and statuses untouched', async () => {
      const actual = await refresh(nonVacantUserModifiedHousings);
      expect(actual).toHaveLength(nonVacantUserModifiedHousings.length);
      actual.forEach((actualHousing) => {
        const housingBefore = housingsBefore.find(
          (housing) => housing.id === actualHousing.id
        );
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: housingBefore?.occupancy,
          occupancy_source: housingBefore?.occupancyRegistered,
          status: housingBefore?.status,
          sub_status: housingBefore?.subStatus
        });
      });
    });

    it('should set non-vacant, non-user-modified housings as vacant and never contacted', async () => {
      const actual = await refresh(nonVacantNonUserModifiedHousings);
      expect(actual).toHaveLength(nonVacantNonUserModifiedHousings.length);
      actual.forEach((actualHousing) => {
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: Occupancy.VACANT,
          status: HousingStatus.NEVER_CONTACTED,
          sub_status: null
        });
      });

      const actualEvents = await Events()
        .join(
          HOUSING_EVENTS_TABLE,
          `${HOUSING_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .whereIn(
          [
            `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
            `${HOUSING_EVENTS_TABLE}.housing_id`
          ],
          actual.map((actualHousing) => [
            actualHousing.geo_code,
            actualHousing.id
          ])
        );
      actual.forEach((actualHousing) => {
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          type: 'housing:occupancy-updated'
        });
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          type: 'housing:status-updated'
        });
      });
    });
  });

  function refresh(
    housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>
  ): Promise<ReadonlyArray<HousingRecordDBO>> {
    return Housing().whereIn(
      ['geo_code', 'id'],
      housings.map((housing) => [housing.geoCode, housing.id])
    );
  }

  function toSourceHousing(housing: HousingApi): SourceHousing {
    if (!housing.buildingId) {
      throw new Error('housing.buildingId must be defined');
    }
    return {
      ...genSourceHousing(),
      geo_code: housing.geoCode,
      local_id: housing.localId,
      building_id: housing.buildingId,
      occupancy_source: housing.occupancy
    };
  }
});

/**
 * Write source housings as hive-partitioned parquet files
 * (simulates the output of prepare-housings.sh)
 */
async function writeParquetDepts(
  deptsDir: string,
  sourceHousings: ReadonlyArray<SourceHousing>
): Promise<void> {
  const jsonlFile = path.join(deptsDir, '..', 'source-housings-test.jsonl');
  fs.mkdirSync(path.dirname(jsonlFile), { recursive: true });
  fs.writeFileSync(
    jsonlFile,
    sourceHousings.map((h) => JSON.stringify(h)).join('\n')
  );

  const instance = await DuckDBInstance.create(':memory:');
  const conn = await instance.connect();
  try {
    await conn.run(`
      COPY (
        SELECT *, geo_code[1:2] AS dept
        FROM read_json_auto('${jsonlFile}')
      ) TO '${deptsDir}' (FORMAT PARQUET, PARTITION_BY (dept), OVERWRITE_OR_IGNORE);
    `);
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
  fs.unlinkSync(jsonlFile);
}
```

Key changes from the original test:
- Removed `geoCodeChangedHousings` and the test `should update the housing geo code if it changed` (geo-code correction is now `prepare-housings.sh`'s responsibility)
- Replaced `write()` (JSONL writer) with `writeParquetDepts()` (writes hive-partitioned parquet via DuckDB)
- Command called with `deptsDir` instead of `file`
- Removed `stringify as writeJSONL` / `jsonlines`, `Transform`, `Writable` imports
- Added `DuckDBInstance` import
- Removed unused `path` import for JSONL file

- [ ] **Step 2: Run tests**

```bash
yarn nx test server -- source-housing-command
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts
git commit -m "test(server): update housing command tests to use parquet fixtures"
```

---

### Task 5: Delete `source-housing-duckdb.ts` and its test

**Files:**
- Delete: `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts`
- Delete: `server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts`

- [ ] **Step 1: Delete files**

```bash
git rm server/src/scripts/import-lovac/source-housings/source-housing-duckdb.ts \
       server/src/scripts/import-lovac/source-housings/source-housing-duckdb.test.ts
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "source-housing-duckdb\|prepareHousingImport" server/src/
```

Expected: no output (no remaining references).

- [ ] **Step 3: Run full test suite**

```bash
yarn nx test server -- source-housing
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(server): remove source-housing-duckdb.ts (logic moved to prepare-housings.sh)"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| DuckDB shell script for geo-code detection + correction | Task 1 |
| Direct UPDATE via `postgres_execute` (no Knex temp table) | Task 1 |
| Dept split in shell script | Task 1 |
| Report (changes count, dept count) | Task 1 |
| Simplified Node.js command (deptsDir input) | Task 2 |
| CLI updated | Task 3 |
| Tests updated (parquet fixtures, no geo-code assertions) | Task 4 |
| `source-housing-duckdb.ts` removed | Task 5 |

### Placeholder scan

No placeholders found. All tasks contain complete code.

### Type consistency

- `deptsDir` parameter name consistent across command (Task 2), CLI (Task 3), and test (Task 4)
- `ExecOptions` interface unchanged
- `writeReport` receives `deptsDir` (was `file`) — consistent in Task 2
