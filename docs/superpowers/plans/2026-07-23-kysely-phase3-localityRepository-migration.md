# Kysely Migration — Phase 3: localityRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `localityRepository`'s `find`, `get`, and `update` from Knex to Kysely, verified green against the characterization tests added in `2026-07-23-kysely-phase2-localityRepository-tests.md`.

**Architecture:** Follow the established small-repo pattern (`resetLinkRepository.ts`, `noteRepository.ts`): keep the exported `localitiesTable` constant and the `Localities()` Knex accessor unchanged (test/seed backward compat — `formatLocalityApi` is still called externally by `housingRepository.test.ts`, `locality-api.test.ts`, and the `20240405011849_establishments` seed, all via `Localities().insert(formatLocalityApi(...))`, so neither can change shape). Replace the three query functions with `kysely.selectFrom('localities')` / `kysely.updateTable('localities')`, using the inline `.$if()` chaining idiom (`noteRepository.ts:56-65`) rather than a separate `filterQuery` helper, since Kysely's `CamelCasePlugin` means filter conditions can reference typed camelCase columns directly. Add a new `parseLocalityRow` (mirrors `noteRepository.ts`'s `parseNoteRow`) to replace the now-fully-internal `parseLocalityApi`, which becomes dead once `find`/`get`/`update` stop calling it.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), Knex (kept only for the `Localities()` test/seed accessor), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the Phase-2 tests in `server/src/repositories/test/localityRepository.test.ts` must pass UNCHANGED against the migrated code — they are the correctness gate. Do not edit the test file in this phase unless a test is found to encode an implementation detail rather than observable behavior (none currently do).
- **Do not change:** `localitiesTable`, `Localities()`, `formatLocalityApi`, `LocalityDBO` (the snake_case interface) — all are still consumed externally by seeds/tests via the Knex accessor.
- **`establishmentsTable`/`Establishments` import:** the `establishmentId` filter's raw `UNNEST(...)` fragment still needs the literal snake_case column name `establishments.localities_geo_code` — raw `sql` fragments bypass `CamelCasePlugin`, so do not camelCase this string.
- **Known type/runtime mismatch to preserve, not fix:** `LocalityDTO.taxRate` is typed `number | undefined`, but the DB column is nullable and the current (Knex) code returns a literal `null` when unset — confirmed empirically against the real DB in Phase 2. `DB['localities'].taxRate` (Kysely-generated, more accurate) is `number | null`. Cast with `as number | undefined` at the one assignment site in `parseLocalityRow` to preserve the exact existing (slightly inaccurate) type contract; do not widen `LocalityDTO.taxRate` itself — that is a `packages/models` change with frontend blast radius, out of scope here.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings on the modified file; (3) the full Phase-2 test file green.
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate `find`, `get`, `update` to Kysely

**Files:**

- Modify: `server/src/repositories/localityRepository.ts`

**Interfaces:**

- Consumes: `kysely` from `~/infra/database/kysely` (`Kysely<DB>`); `DB['localities']` type (`geoCode: string`, `id: Generated<string>`, `localityKind: string | null`, `name: string`, `taxKind: Generated<string>`, `taxRate: number | null`).
- Produces: `find(options: FindOptions): Promise<ReadonlyArray<LocalityApi>>`, `get(geoCode: string): Promise<LocalityApi | null>`, `update(localityApi: LocalityApi): Promise<LocalityApi>` — same public signatures as before, consumed by `localityController.ts` and `establishmentLocalityRepository.ts` (verify no other internal caller of `filterQuery` or `parseLocalityApi` exists before deleting them).

- [x] **Step 1: Replace the file contents**

```typescript
import { LocalityKind, TaxKind } from '@zerologementvacant/models';
import { Knex } from 'knex';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createLogger } from '~/infra/logger';
import { LocalityApi } from '~/models/LocalityApi';
import { establishmentsTable } from '~/repositories/establishmentRepository';

export const localitiesTable = 'localities';
export const Localities = (transaction = db) =>
  transaction<LocalityDBO>(localitiesTable);

const logger = createLogger('localityRepository');

interface LocalityFilters {
  establishmentId?: string;
  /**
   * Filter by specific geoCodes (used for user perimeter filtering)
   */
  geoCodes?: string[];
}

interface FindOptions {
  filters?: LocalityFilters;
}

async function find(options: FindOptions): Promise<ReadonlyArray<LocalityApi>> {
  const filters = options?.filters;
  const rows = await kysely
    .selectFrom('localities')
    .selectAll()
    // Filter by specific geoCodes (user perimeter filtering takes priority)
    // Note: geoCodes is an array when a restriction applies
    //   - non-empty array: filter to localities with these geoCodes
    //   - empty array: user should see NO localities (intersection with perimeter is empty)
    .$if(
      filters?.geoCodes !== undefined && filters.geoCodes.length === 0,
      (query) => query.where(sql<boolean>`1 = 0`)
    )
    .$if(!!filters?.geoCodes?.length, (query) =>
      query.where('geoCode', 'in', filters?.geoCodes ?? [])
    )
    // Filter by establishment geoCodes (default behavior) — only when geoCodes wasn't provided at all
    .$if(
      filters?.geoCodes === undefined && !!filters?.establishmentId,
      (query) =>
        query.where(
          'geoCode',
          'in',
          kysely
            .selectFrom('establishments')
            .select(
              sql<string>`UNNEST(${sql.raw(establishmentsTable)}.locali\
ties_geo_code::varchar[])`.as('geoCode')
            )
            .where('id', '=', filters?.establishmentId ?? '')
        )
    )
    .orderBy('name')
    .execute();

  return rows.map(parseLocalityRow);
}

async function get(geoCode: string): Promise<LocalityApi | null> {
  logger.debug('Get locality', { geoCode });
  const row = await kysely
    .selectFrom('localities')
    .selectAll()
    .where('geoCode', '=', geoCode)
    .executeTakeFirst();
  return row ? parseLocalityRow(row) : null;
}

export interface LocalityDBO {
  id: string;
  geo_code: string;
  name: string;
  locality_kind: LocalityKind | null;
  tax_kind?: string;
  tax_rate?: number;
}

async function update(localityApi: LocalityApi): Promise<LocalityApi> {
  logger.info('Update localityApi with geoCode', localityApi.geoCode);

  const row = await kysely
    .updateTable('localities')
    .set({
      taxRate: localityApi.taxRate ?? null,
      taxKind: localityApi.taxKind
    })
    .where('geoCode', '=', localityApi.geoCode)
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseLocalityRow(row);
}

export const formatLocalityApi = (locality: LocalityApi): LocalityDBO => ({
  id: locality.id,
  geo_code: locality.geoCode,
  name: locality.name,
  locality_kind: locality.kind,
  tax_kind: locality.taxKind,
  tax_rate: locality.taxRate
});

function parseLocalityRow(row: Selectable<DB['localities']>): LocalityApi {
  return {
    id: row.id,
    geoCode: row.geoCode,
    name: row.name,
    kind: row.localityKind as LocalityKind | null,
    taxKind: row.taxKind as TaxKind,
    // DB column is nullable and the pre-Kysely code already returned a
    // literal `null` here despite LocalityDTO.taxRate being typed
    // `number | undefined` — preserved as-is, not fixed (see plan's Global
    // Constraints).
    taxRate: row.taxRate as number | undefined
  };
}

export default {
  find,
  get,
  formatLocalityApi,
  update
};
```

Note: the `sql.raw(establishmentsTable)` interpolation (rather than a plain template-literal `${establishmentsTable}`) is required because `establishmentsTable` is a _table name_, not a bound value — `sql\`...${establishmentsTable}...\`` would bind it as a query parameter (`$1`) and produce invalid SQL (`UNNEST($1.locali...)`), whereas `sql.raw(...)`splices it verbatim into the SQL text, matching the original Knex`db.raw(...)` string-interpolation behavior exactly.

- [x] **Step 2: Run the characterization tests to verify the migration preserves behavior**

Run: `yarn nx test server -- run src/repositories/test/localityRepository.test.ts`
Expected: all 8 tests pass, unchanged from Phase 2.

- [x] **Step 3: Run the controller test that also exercises this repository**

Run: `yarn nx test server -- run src/controllers/test/locality-api.test.ts`
Expected: all tests pass.

- [x] **Step 4: Check for other internal callers before considering the migration complete**

Run: `grep -rn "localityRepository.formatLocalityApi\|from '\.\./localityRepository'\|from '~/repositories/localityRepository'" server/src --include="*.ts" | grep -v test`

Confirm every remaining call site only uses `find`, `get`, `update`, `formatLocalityApi`, or `localitiesTable`/`Localities` (the preserved surface) — not `parseLocalityApi` or `filterQuery` (both removed; neither was exported).

- [x] **Step 5: Mandatory gates**

Run: `yarn nx typecheck server`
Expected: 0 errors.

Run: `yarn lint`
Expected: 0 warnings on `server/src/repositories/localityRepository.ts`.

- [ ] **Step 6: Commit**

```bash
git add server/src/repositories/localityRepository.ts
git commit -m "feat(server): migrate localityRepository to Kysely"
```
