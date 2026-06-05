# Import Buildings via DuckDB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Node.js source-building streaming importer with a DuckDB shell script that bulk-inserts buildings `ON CONFLICT DO NOTHING` and writes a before/after stats report.

**Architecture:** The existing Node.js pipeline (processor, command, file-repository) is deleted. A single `import-buildings.sh` shell script uses the DuckDB CLI to read a JSONL source file, attach the Postgres database, and insert with conflict skipping. `BuildingDBO` gains a new `rnb_footprint` column to match a migration already applied.

**Tech Stack:** Bash, DuckDB CLI (`duckdb`), PostgreSQL (via DuckDB `postgres` extension)

---

## File Map

| Action | Path |
|--------|------|
| Modify | `server/src/repositories/buildingRepository.ts` |
| Modify | `server/src/scripts/import-lovac/cli.ts` |
| Modify | `server/src/scripts/import-lovac/infra/fixtures.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/source-building.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/source-building-command.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/source-building-processor.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/source-building-file-repository.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/test/source-building.test.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/test/source-building-processor.test.ts` |
| Delete | `server/src/scripts/import-lovac/source-buildings/test/source-building-file-repository.test.ts` |
| Create | `server/src/scripts/import-lovac/source-buildings/import-buildings.sh` |

---

## Task 1: Add `rnb_footprint` to `BuildingDBO`

**Files:**
- Modify: `server/src/repositories/buildingRepository.ts`

- [ ] **Step 1: Add `rnb_footprint` to `BuildingDBO`**

In `buildingRepository.ts`, add the field after `rnb_id_score`:

```typescript
export interface BuildingDBO {
  id: string;
  housing_count: number;
  vacant_housing_count: number;
  rent_housing_count: number | null;
  rnb_id: string | null;
  rnb_id_score: number | null;
  rnb_footprint: number | null;   // ← add this
  dpe_id: string | null;
  // ... rest unchanged
}
```

- [ ] **Step 2: Update `formatBuildingApi`**

`formatBuildingApi` converts `BuildingApi` → `BuildingDBO`. `BuildingApi` has no `rnb_footprint`, so default to `null`:

```typescript
export function formatBuildingApi(building: BuildingApi): BuildingDBO {
  return {
    id: building.id,
    housing_count: building.housingCount,
    vacant_housing_count: building.vacantHousingCount,
    rent_housing_count: building.rentHousingCount,
    rnb_id: building.rnb?.id ?? null,
    rnb_id_score: building.rnb?.score ?? null,
    rnb_footprint: null,          // ← add this
    dpe_id: building.dpe?.id ?? null,
    class_dpe: building.dpe?.class ?? null,
    class_ges: building.ges?.class ?? null,
    dpe_date_at: building.dpe?.doneAt ?? null,
    dpe_type: building.dpe?.type ?? null,
    heating_building: building.heating ?? null,
    dpe_import_match: building.dpe?.match ?? null
  };
}
```

- [ ] **Step 3: Update `parseBuildingApi`**

`parseBuildingApi` converts `BuildingDBO` → `BuildingApi`. The `rnb` object currently only uses `rnb_id_score` for the null-check. No change needed to the returned `BuildingApi` shape (it doesn't expose `rnb_footprint`), but verify TypeScript compiles cleanly:

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/repositories/buildingRepository.ts
git commit -m "feat(server): add rnb_footprint to BuildingDBO"
```

---

## Task 2: Remove the source-building Node.js importer

**Files:**
- Delete: all `source-buildings/` TypeScript files and tests
- Modify: `server/src/scripts/import-lovac/cli.ts`
- Modify: `server/src/scripts/import-lovac/infra/fixtures.ts`

- [ ] **Step 1: Delete source-building TypeScript files**

```bash
rm server/src/scripts/import-lovac/source-buildings/source-building.ts
rm server/src/scripts/import-lovac/source-buildings/source-building-command.ts
rm server/src/scripts/import-lovac/source-buildings/source-building-processor.ts
rm server/src/scripts/import-lovac/source-buildings/source-building-file-repository.ts
rm server/src/scripts/import-lovac/source-buildings/test/source-building.test.ts
rm server/src/scripts/import-lovac/source-buildings/test/source-building-processor.test.ts
rm server/src/scripts/import-lovac/source-buildings/test/source-building-file-repository.test.ts
```

- [ ] **Step 2: Remove `buildings` command from `cli.ts`**

Remove the import and the command block. The file currently has:

```typescript
import { createSourceBuildingCommand } from '~/scripts/import-lovac/source-buildings/source-building-command';
```

and:

```typescript
program
  .command('buildings')
  .description('Import buildings from a file to an existing database')
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(year)
  .action(async (file, options) => {
    const command = createSourceBuildingCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });
```

Delete both. No other changes to `cli.ts`.

- [ ] **Step 3: Remove `genSourceBuilding` from `infra/fixtures.ts`**

Delete the `genSourceBuilding` function and its `SourceBuilding` import:

```typescript
// Remove this import:
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';

// Remove this function:
export function genSourceBuilding(): SourceBuilding {
  return {
    building_id: faker.string.alphanumeric(15),
    housing_vacant_count: faker.number.int({ min: 0, max: 10 }),
    housing_rent_count: faker.number.int({ min: 0, max: 10 })
  };
}
```

- [ ] **Step 4: Verify typecheck and tests pass**

```bash
yarn nx typecheck server
yarn nx test server -- source-buildings
```

Expected: typecheck clean, no test files found for source-buildings (all deleted).

- [ ] **Step 5: Commit**

```bash
git add -A server/src/scripts/import-lovac/source-buildings/ \
         server/src/scripts/import-lovac/cli.ts \
         server/src/scripts/import-lovac/infra/fixtures.ts
git commit -m "feat(server): remove source-building Node.js importer"
```

---

## Task 3: Create `import-buildings.sh`

**Files:**
- Create: `server/src/scripts/import-lovac/source-buildings/import-buildings.sh`

The script uses the DuckDB CLI to:
1. Read source file stats (total rows, RNB coverage)
2. Snapshot the `buildings` table count before import
3. Insert all rows `ON CONFLICT (id) DO NOTHING`
4. Snapshot the count after
5. Write a JSON report

- [ ] **Step 1: Create the script**

```bash
cat > server/src/scripts/import-lovac/source-buildings/import-buildings.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

FILE="${1:?Usage: $0 <file> <pg_url> [report_file]}"
PG_URL="${2:?Usage: $0 <file> <pg_url> [report_file]}"
REPORT_FILE="${3:-import-lovac-buildings.report.json}"

echo "Importing buildings from ${FILE}..."
echo "Report will be written to ${REPORT_FILE}"

duckdb :memory: <<SQL
ATTACH '${PG_URL}' AS pg (TYPE POSTGRES);

-- Load source file into memory once
CREATE TEMP TABLE source AS
  SELECT * FROM read_json_auto('${FILE}');

-- Snapshot before
CREATE TEMP TABLE before_count AS
  SELECT COUNT(*)::BIGINT AS n FROM pg.buildings;

-- Bulk insert, skip existing ids
INSERT INTO pg.buildings (id, rnb_id, rnb_id_score, rnb_footprint, housing_count, vacant_housing_count)
SELECT
  building_id  AS id,
  rnb_id,
  rnb_id_score,
  rnb_footprint,
  0            AS housing_count,
  0            AS vacant_housing_count
FROM source
ON CONFLICT (id) DO NOTHING;

-- Write report
COPY (
  WITH
    src    AS (SELECT COUNT(*)::BIGINT        AS total,
                      COUNT(rnb_id)::BIGINT   AS with_rnb
               FROM source),
    before AS (SELECT n FROM before_count),
    after  AS (SELECT COUNT(*)::BIGINT AS n FROM pg.buildings)
  SELECT
    src.total                         AS source_total,
    src.with_rnb                      AS source_with_rnb,
    src.total - src.with_rnb          AS source_without_rnb,
    before.n                          AS before_count,
    after.n                           AS after_count,
    after.n  - before.n               AS inserted,
    src.total - (after.n - before.n)  AS skipped
  FROM src, before, after
) TO '${REPORT_FILE}' (FORMAT JSON, ARRAY true);

SELECT
  'source_total'      AS metric, src.total::VARCHAR       AS value FROM (SELECT COUNT(*) AS total FROM source) src
UNION ALL SELECT 'inserted', (after.n - before.n)::VARCHAR FROM
  (SELECT COUNT(*) AS n FROM pg.buildings) after,
  (SELECT n FROM before_count) before
UNION ALL SELECT 'skipped', (src.total - (after.n - before.n))::VARCHAR FROM
  (SELECT COUNT(*) AS total FROM source) src,
  (SELECT COUNT(*) AS n FROM pg.buildings) after,
  (SELECT n FROM before_count) before;
SQL

echo "Done. Report:"
cat "${REPORT_FILE}"
EOF
chmod +x server/src/scripts/import-lovac/source-buildings/import-buildings.sh
```

The report shape written to `$REPORT_FILE`:
```json
[{
  "source_total": 1000,
  "source_with_rnb": 800,
  "source_without_rnb": 200,
  "before_count": 500,
  "after_count": 1400,
  "inserted": 900,
  "skipped": 100
}]
```

- [ ] **Step 2: Smoke-test the script locally**

You need:
- `duckdb` CLI installed (`brew install duckdb` or from https://duckdb.org/docs/installation)
- A sample JSONL file with the right shape
- A reachable Postgres URL

Create a minimal test file:
```bash
cat > /tmp/buildings-test.jsonl << 'EOF'
{"building_id":"TEST001","rnb_id":"RNB001","rnb_id_score":0.9,"rnb_footprint":120}
{"building_id":"TEST002","rnb_id":null,"rnb_id_score":null,"rnb_footprint":null}
EOF
```

Run:
```bash
bash server/src/scripts/import-lovac/source-buildings/import-buildings.sh \
  /tmp/buildings-test.jsonl \
  "postgresql://postgres:postgres@localhost/dev" \
  /tmp/test-buildings.report.json
```

Expected output (counts may vary):
```
Importing buildings from /tmp/buildings-test.jsonl...
Report will be written to /tmp/test-buildings.report.json
Done. Report:
[{"source_total":2,"source_with_rnb":1,"source_without_rnb":1,"before_count":0,"after_count":2,"inserted":2,"skipped":0}]
```

Run a second time to verify `ON CONFLICT DO NOTHING`:

```bash
bash server/src/scripts/import-lovac/source-buildings/import-buildings.sh \
  /tmp/buildings-test.jsonl \
  "postgresql://postgres:postgres@localhost/dev" \
  /tmp/test-buildings.report.json
```

Expected: `"inserted":0,"skipped":2` — both rows skipped, DB count unchanged.

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/import-lovac/source-buildings/import-buildings.sh
git commit -m "feat(server): add import-buildings.sh DuckDB script with before/after report"
```
