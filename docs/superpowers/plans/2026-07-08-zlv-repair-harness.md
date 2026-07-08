# ZLV Repair Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable `zlv repair` CLI that lets developers bulk-correct housing data (status, sub-status, events) through a typed `Repair<H>` interface with a Terraform-style `plan` → `apply` workflow.

**Architecture:** Each repair is one TypeScript file implementing `query()` + `decide()`. A shared scaffold in `lib/` handles plan file generation (JSONL), atomic application (chunked transactions), and error/skipped collection. The `zlv` binary (commander) exposes `list | plan | stats | apply` commands.

**Tech Stack:** TypeScript (ESM), commander 14, effect/Array (chunksOf), Knex (transactions), Vitest (tests), tsx (dev runner).

## Global Constraints

- All new files are ESM TypeScript (`"type": "module"` in server package.json).
- Tests use Vitest — never Jest.
- Integration tests hit a real test DB — never mock the DB (project convention).
- Transactions: `startTransaction()` in the caller, `withinTransaction()` in repositories.
- `chunksOf` is imported from `'effect/Array'`.
- `commander` and `@commander-js/extra-typings` are already installed at `14.x`.
- Run scripts with `NODE_OPTIONS='--import tsx/esm' tsx <file>` — no compile step needed in dev.
- All imports inside `server/src/` use the `~/` alias (maps to `server/src/`).
- Tests for scripts live at `server/src/scripts/repairs/lib/test/`.

---

## File Map

| Path                                                                                  | Action | Responsibility                                                                                                                                |
| ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/scripts/repairs/lib/types.ts`                                             | Create | Core interfaces: `Repair<H>`, `RepairAction`, `RepairSkip`, `RepairError`, `PlanRow`, `SkippedRow`, `ErrorRow`, `PlanSummary`, `ApplySummary` |
| `server/src/repositories/eventRepository.ts`                                          | Modify | Add `deleteManyHousingEvents(ids: string[])`                                                                                                  |
| `server/src/scripts/repairs/lib/plan.ts`                                              | Create | `plan(repair, options)` — query → decide → write plan/skipped/errors JSONL                                                                    |
| `server/src/scripts/repairs/lib/apply.ts`                                             | Create | `apply(planFile)` — read plan.jsonl → group by payload → chunk → single transaction                                                           |
| `server/src/scripts/repairs/lib/stats.ts`                                             | Create | `stats(planFile)` — count plan.jsonl rows without touching DB                                                                                 |
| `server/src/scripts/repairs/index.ts`                                                 | Create | Repair registry: maps name → `Repair<any>`                                                                                                    |
| `server/src/scripts/repairs/cli.ts`                                                   | Create | `repairCommand()` returning a commander `Command`                                                                                             |
| `server/src/bin/zlv.ts`                                                               | Create | Top-level `zlv` binary entry point                                                                                                            |
| `server/package.json`                                                                 | Modify | Add `"zlv"` script entry                                                                                                                      |
| `server/src/scripts/repairs/lib/test/plan.test.ts`                                    | Create | Unit tests for `plan()`                                                                                                                       |
| `server/src/scripts/repairs/lib/test/apply.test.ts`                                   | Create | Integration tests for `apply()`                                                                                                               |
| `server/src/scripts/repairs/lib/test/eventRepository-deleteManyHousingEvents.test.ts` | Create | Integration test for `deleteManyHousingEvents()`                                                                                              |

---

## Task 1: Core types

**Files:**

- Create: `server/src/scripts/repairs/lib/types.ts`

**Interfaces:**

- Produces: `Repair<H>`, `RepairAction`, `RepairSkip`, `RepairError`, `PlanRow`, `SkippedRow`, `ErrorRow`, `PlanSummary`, `ApplySummary` — consumed by all subsequent tasks.

- [ ] **Step 1: Create the types file**

```typescript
// server/src/scripts/repairs/lib/types.ts
import type { HousingApi, HousingId } from '~/models/HousingApi';
import type { HousingEventApi } from '~/models/EventApi';

export type { HousingId };

export interface Repair<H extends HousingApi = HousingApi> {
  name: string;
  query(): Promise<H[]>;
  decide(housing: H): RepairAction | RepairSkip | RepairError;
}

export interface RepairAction {
  update?: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >;
  createEvents?: HousingEventApi[];
  deleteEventIds?: string[];
}

export interface RepairSkip {
  action: 'skip';
}

export interface RepairError {
  action: 'error';
  reason: string;
}

export interface PlanRow {
  housingId: string;
  housingGeoCode: string;
  update?: RepairAction['update'];
  createEvents?: HousingEventApi[];
  deleteEventIds?: string[];
}

export interface SkippedRow {
  housingId: string;
  housingGeoCode: string;
}

export interface ErrorRow {
  housingId: string;
  housingGeoCode: string;
  reason: string;
}

export interface PlanSummary {
  total: number;
  planned: number;
  skipped: number;
  errors: number;
  eventsToDelete: number;
  eventsToCreate: number;
}

export interface ApplySummary {
  updated: number;
  eventsDeleted: number;
  eventsCreated: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/scripts/repairs/lib/types.ts
git commit -m "feat(repairs): add core types for repair harness"
```

---

## Task 2: `eventRepository.deleteManyHousingEvents()`

**Files:**

- Modify: `server/src/repositories/eventRepository.ts`
- Test: `server/src/scripts/repairs/lib/test/eventRepository-deleteManyHousingEvents.test.ts`

**Interfaces:**

- Consumes: `Events`, `HousingEvents`, `EVENTS_TABLE`, `HOUSING_EVENTS_TABLE`, `withinTransaction` — all already in `eventRepository.ts`.
- Produces: `eventRepository.deleteManyHousingEvents(ids: string[]): Promise<void>` — consumed by Task 4 (`apply.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// server/src/scripts/repairs/lib/test/eventRepository-deleteManyHousingEvents.test.ts
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  Events,
  EVENTS_TABLE,
  HousingEvents,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import eventRepository from '~/repositories/eventRepository';
import { genHousingApi } from '~/test/testFixtures';
import { Housings } from '~/repositories/housingRepository';

const housing = genHousingApi();

beforeEach(async () => {
  await Housings().insert({
    /* minimal housing row */ id: housing.id,
    geo_code: housing.geoCode
  });
});

describe('deleteManyHousingEvents', () => {
  it('hard-deletes the given event ids from events and housing_events', async () => {
    const eventId = uuidv4();
    await Events().insert({
      id: eventId,
      type: 'housing:status-updated',
      next_old: null,
      next_new: null,
      created_at: new Date(),
      created_by: uuidv4()
    });
    await HousingEvents().insert({
      event_id: eventId,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    await eventRepository.deleteManyHousingEvents([eventId]);

    const remainingEvents = await Events().where('id', eventId);
    const remainingHousingEvents = await HousingEvents().where(
      'event_id',
      eventId
    );
    expect(remainingEvents).toHaveLength(0);
    expect(remainingHousingEvents).toHaveLength(0);
  });

  it('is a no-op for an empty array', async () => {
    await expect(
      eventRepository.deleteManyHousingEvents([])
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
yarn nx test server -- eventRepository-deleteManyHousingEvents
```

Expected: FAIL — `eventRepository.deleteManyHousingEvents is not a function`.

- [ ] **Step 3: Implement `deleteManyHousingEvents` in eventRepository.ts**

Add before the `export default` block (after `removeCampaignEvents`):

```typescript
async function deleteManyHousingEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  logger.debug('Deleting housing events...', { count: ids.length });
  await withinTransaction(async (transaction) => {
    await HousingEvents(transaction).whereIn('event_id', ids).delete();
    await Events(transaction).whereIn('id', ids).delete();
  });
  logger.debug('Housing events deleted', { count: ids.length });
}
```

Add to the `export default` object at the bottom:

```typescript
export default {
  // ...existing exports...
  deleteManyHousingEvents
};
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
yarn nx test server -- eventRepository-deleteManyHousingEvents
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/eventRepository.ts \
        server/src/scripts/repairs/lib/test/eventRepository-deleteManyHousingEvents.test.ts
git commit -m "feat(repairs): add deleteManyHousingEvents to eventRepository"
```

---

## Task 3: `plan()` function

**Files:**

- Create: `server/src/scripts/repairs/lib/plan.ts`
- Test: `server/src/scripts/repairs/lib/test/plan.test.ts`

**Interfaces:**

- Consumes: `Repair<H>`, `RepairAction`, `RepairSkip`, `RepairError`, `PlanRow`, `SkippedRow`, `ErrorRow`, `PlanSummary` from `./types`.
- Produces: `plan(repair: Repair<H>, options?: PlanOptions): Promise<PlanSummary>` — consumed by Task 5 (CLI).
- Side effects: writes `plan.jsonl`, `skipped.jsonl`, `errors.jsonl` to `options.outDir` (default: `process.cwd()`).

- [ ] **Step 1: Write the failing tests**

```typescript
// server/src/scripts/repairs/lib/test/plan.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HousingStatus } from '@zerologementvacant/models';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { genHousingApi } from '~/test/testFixtures';
import { plan } from '../plan';
import type { Repair } from '../types';

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-repair-'));
});

afterEach(() => {
  fs.rmSync(outDir, { recursive: true });
});

describe('plan()', () => {
  it('writes RepairActions to plan.jsonl', async () => {
    const housing = genHousingApi();
    const repair: Repair = {
      name: 'test',
      query: async () => [housing],
      decide: () => ({
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.planned).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);

    const lines = fs
      .readFileSync(path.join(outDir, 'plan.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(lines).toHaveLength(1);
    const row = JSON.parse(lines[0]);
    expect(row).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
    });
  });

  it('writes RepairSkips to skipped.jsonl', async () => {
    const housing = genHousingApi();
    const repair: Repair = {
      name: 'test',
      query: async () => [housing],
      decide: () => ({ action: 'skip' })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.skipped).toBe(1);
    expect(summary.planned).toBe(0);

    const lines = fs
      .readFileSync(path.join(outDir, 'skipped.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(JSON.parse(lines[0])).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode
    });
  });

  it('writes RepairErrors to errors.jsonl', async () => {
    const housing = genHousingApi();
    const repair: Repair = {
      name: 'test',
      query: async () => [housing],
      decide: () => ({ action: 'error', reason: 'no restorable event' })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.errors).toBe(1);

    const lines = fs
      .readFileSync(path.join(outDir, 'errors.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(JSON.parse(lines[0])).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      reason: 'no restorable event'
    });
  });

  it('counts events to delete and create in summary', async () => {
    const housing = genHousingApi();
    const repair: Repair = {
      name: 'test',
      query: async () => [housing],
      decide: () => ({
        update: { status: HousingStatus.NEVER_CONTACTED },
        deleteEventIds: ['evt-1', 'evt-2'],
        createEvents: []
      })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.eventsToDelete).toBe(2);
    expect(summary.eventsToCreate).toBe(0);
  });

  it('returns correct totals across all outcomes', async () => {
    const [h1, h2, h3] = [genHousingApi(), genHousingApi(), genHousingApi()];
    const repair: Repair = {
      name: 'test',
      query: async () => [h1, h2, h3],
      decide: (h) => {
        if (h.id === h1.id)
          return { update: { status: HousingStatus.NEVER_CONTACTED } };
        if (h.id === h2.id) return { action: 'skip' };
        return { action: 'error', reason: 'test' };
      }
    };

    const summary = await plan(repair, { outDir });

    expect(summary).toEqual({
      total: 3,
      planned: 1,
      skipped: 1,
      errors: 1,
      eventsToDelete: 0,
      eventsToCreate: 0
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
yarn nx test server -- plan.test
```

Expected: FAIL — `Cannot find module '../plan'`.

- [ ] **Step 3: Implement `plan.ts`**

```typescript
// server/src/scripts/repairs/lib/plan.ts
import fs from 'node:fs';
import path from 'node:path';

import type { HousingApi } from '~/models/HousingApi';

import type {
  ErrorRow,
  PlanRow,
  PlanSummary,
  Repair,
  RepairAction,
  RepairError,
  RepairSkip,
  SkippedRow
} from './types';

export interface PlanOptions {
  outDir?: string;
}

export async function plan<H extends HousingApi>(
  repair: Repair<H>,
  options: PlanOptions = {}
): Promise<PlanSummary> {
  const outDir = options.outDir ?? process.cwd();

  const planStream = fs.createWriteStream(path.join(outDir, 'plan.jsonl'));
  const skippedStream = fs.createWriteStream(
    path.join(outDir, 'skipped.jsonl')
  );
  const errorsStream = fs.createWriteStream(path.join(outDir, 'errors.jsonl'));

  const housings = await repair.query();
  let planned = 0,
    skipped = 0,
    errors = 0,
    eventsToDelete = 0,
    eventsToCreate = 0;

  for (const housing of housings) {
    const decision = repair.decide(housing);

    if (isSkip(decision)) {
      const row: SkippedRow = {
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      };
      skippedStream.write(JSON.stringify(row) + '\n');
      skipped++;
    } else if (isError(decision)) {
      const row: ErrorRow = {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        reason: decision.reason
      };
      errorsStream.write(JSON.stringify(row) + '\n');
      errors++;
    } else {
      const row: PlanRow = {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        ...decision
      };
      planStream.write(JSON.stringify(row) + '\n');
      planned++;
      eventsToDelete += decision.deleteEventIds?.length ?? 0;
      eventsToCreate += decision.createEvents?.length ?? 0;
    }
  }

  await Promise.all([
    streamEnd(planStream),
    streamEnd(skippedStream),
    streamEnd(errorsStream)
  ]);

  return {
    total: housings.length,
    planned,
    skipped,
    errors,
    eventsToDelete,
    eventsToCreate
  };
}

function isSkip(d: RepairAction | RepairSkip | RepairError): d is RepairSkip {
  return 'action' in d && d.action === 'skip';
}

function isError(d: RepairAction | RepairSkip | RepairError): d is RepairError {
  return 'action' in d && d.action === 'error';
}

function streamEnd(stream: fs.WriteStream): Promise<void> {
  return new Promise((resolve, reject) =>
    stream.end((err) => (err ? reject(err) : resolve()))
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn nx test server -- plan.test
```

Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/scripts/repairs/lib/plan.ts \
        server/src/scripts/repairs/lib/test/plan.test.ts
git commit -m "feat(repairs): add plan() function"
```

---

## Task 4: `apply()` and `stats()` functions

**Files:**

- Create: `server/src/scripts/repairs/lib/apply.ts`
- Create: `server/src/scripts/repairs/lib/stats.ts`
- Test: `server/src/scripts/repairs/lib/test/apply.test.ts`

**Interfaces:**

- Consumes:
  - `housingRepository.updateMany(housings: ReadonlyArray<HousingId>, payload)` from `~/repositories/housingRepository`
  - `eventRepository.deleteManyHousingEvents(ids: string[])` from Task 2
  - `eventRepository.insertManyHousingEvents(events: HousingEventApi[])` from `~/repositories/eventRepository`
  - `startTransaction()` from `~/infra/database/transaction`
  - `chunksOf` from `'effect/Array'`
  - `PlanRow`, `ApplySummary`, `PlanSummary` from `./types`
- Produces:
  - `apply(planFile: string): Promise<ApplySummary>`
  - `stats(planFile: string): Promise<Pick<PlanSummary, 'planned' | 'eventsToDelete' | 'eventsToCreate'>>`

- [ ] **Step 1: Write the failing integration tests for `apply()`**

```typescript
// server/src/scripts/repairs/lib/test/apply.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HousingStatus } from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';

import { Housings } from '~/repositories/housingRepository';
import { Events, HousingEvents } from '~/repositories/eventRepository';
import { genHousingApi } from '~/test/testFixtures';
import { apply } from '../apply';
import type { PlanRow } from '../types';

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-apply-'));
});

function writePlan(rows: PlanRow[]): string {
  const planFile = path.join(outDir, 'plan.jsonl');
  fs.writeFileSync(
    planFile,
    rows.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );
  return planFile;
}

describe('apply()', () => {
  it('updates housing fields from plan rows', async () => {
    const housing = genHousingApi({
      status: HousingStatus.WAITING,
      subStatus: 'En attente de réponse'
    });
    await Housings().insert(formatHousingForDb(housing));

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.updated).toBe(1);
    const [row] = await Housings().where({ id: housing.id });
    expect(row.status).toBe(HousingStatus.NEVER_CONTACTED);
    expect(row.sub_status).toBeNull();
  });

  it('hard-deletes event ids listed in plan rows', async () => {
    const housing = genHousingApi();
    await Housings().insert(formatHousingForDb(housing));

    const eventId = uuidv4();
    await Events().insert({
      id: eventId,
      type: 'housing:status-updated',
      next_old: null,
      next_new: null,
      created_at: new Date(),
      created_by: uuidv4()
    });
    await HousingEvents().insert({
      event_id: eventId,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        deleteEventIds: [eventId]
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.eventsDeleted).toBe(1);
    expect(await Events().where('id', eventId)).toHaveLength(0);
    expect(await HousingEvents().where('event_id', eventId)).toHaveLength(0);
  });

  it('returns correct summary', async () => {
    const [h1, h2] = [genHousingApi(), genHousingApi()];
    await Housings().insert([formatHousingForDb(h1), formatHousingForDb(h2)]);

    const planFile = writePlan([
      {
        housingId: h1.id,
        housingGeoCode: h1.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      },
      {
        housingId: h2.id,
        housingGeoCode: h2.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      }
    ]);

    const summary = await apply(planFile);

    expect(summary).toEqual({ updated: 2, eventsDeleted: 0, eventsCreated: 0 });
  });

  it('does nothing for an empty plan file', async () => {
    const planFile = writePlan([]);
    const summary = await apply(planFile);
    expect(summary).toEqual({ updated: 0, eventsDeleted: 0, eventsCreated: 0 });
  });
});

function formatHousingForDb(housing: ReturnType<typeof genHousingApi>) {
  return {
    id: housing.id,
    geo_code: housing.geoCode,
    status: housing.status,
    sub_status: housing.subStatus ?? null
    // add other non-nullable columns as needed from your test DB setup
  };
}
```

> **Note:** `formatHousingForDb` may need additional required columns depending on the housings table schema. Check `genHousingApi()` output and the Housings table DDL to fill in any missing non-nullable fields.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
yarn nx test server -- apply.test
```

Expected: FAIL — `Cannot find module '../apply'`.

- [ ] **Step 3: Implement `apply.ts`**

```typescript
// server/src/scripts/repairs/lib/apply.ts
import fs from 'node:fs';
import readline from 'node:readline';

import { chunksOf } from 'effect/Array';

import { startTransaction } from '~/infra/database/transaction';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';

import type { ApplySummary, PlanRow } from './types';

export async function apply(planFile: string): Promise<ApplySummary> {
  const rows = await readPlan(planFile);

  if (rows.length === 0) {
    return { updated: 0, eventsDeleted: 0, eventsCreated: 0 };
  }

  const groups = groupByPayload(rows);
  const allDeleteIds = rows.flatMap((r) => r.deleteEventIds ?? []);
  const allCreateEvents = rows.flatMap((r) => r.createEvents ?? []);

  let updated = 0;

  await startTransaction(async () => {
    for (const group of groups) {
      if (!group.payload) continue;
      for (const chunk of chunksOf(group.rows, 1000)) {
        await housingRepository.updateMany(
          chunk.map((r) => ({ id: r.housingId, geoCode: r.housingGeoCode })),
          group.payload
        );
        updated += chunk.length;
      }
    }

    if (allDeleteIds.length > 0) {
      await eventRepository.deleteManyHousingEvents(allDeleteIds);
    }

    if (allCreateEvents.length > 0) {
      await eventRepository.insertManyHousingEvents(allCreateEvents);
    }
  });

  return {
    updated,
    eventsDeleted: allDeleteIds.length,
    eventsCreated: allCreateEvents.length
  };
}

async function readPlan(planFile: string): Promise<PlanRow[]> {
  const rows: PlanRow[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(planFile),
    crlfDelay: Infinity
  });
  for await (const line of rl) {
    if (line.trim()) rows.push(JSON.parse(line) as PlanRow);
  }
  return rows;
}

interface PayloadGroup {
  payload: PlanRow['update'];
  rows: PlanRow[];
}

function groupByPayload(rows: PlanRow[]): PayloadGroup[] {
  const map = new Map<string, PayloadGroup>();
  for (const row of rows) {
    const key = JSON.stringify(row.update ?? null);
    if (!map.has(key)) {
      map.set(key, { payload: row.update, rows: [] });
    }
    map.get(key)!.rows.push(row);
  }
  return Array.from(map.values());
}
```

- [ ] **Step 4: Implement `stats.ts`**

```typescript
// server/src/scripts/repairs/lib/stats.ts
import fs from 'node:fs';
import readline from 'node:readline';

import type { PlanRow, PlanSummary } from './types';

export async function stats(
  planFile: string
): Promise<Pick<PlanSummary, 'planned' | 'eventsToDelete' | 'eventsToCreate'>> {
  const rl = readline.createInterface({
    input: fs.createReadStream(planFile),
    crlfDelay: Infinity
  });
  let planned = 0,
    eventsToDelete = 0,
    eventsToCreate = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as PlanRow;
    planned++;
    eventsToDelete += row.deleteEventIds?.length ?? 0;
    eventsToCreate += row.createEvents?.length ?? 0;
  }

  return { planned, eventsToDelete, eventsToCreate };
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn nx test server -- apply.test
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/repairs/lib/apply.ts \
        server/src/scripts/repairs/lib/stats.ts \
        server/src/scripts/repairs/lib/test/apply.test.ts
git commit -m "feat(repairs): add apply() and stats() functions"
```

---

## Task 5: CLI, registry, and `zlv` binary

**Files:**

- Create: `server/src/scripts/repairs/index.ts`
- Create: `server/src/scripts/repairs/cli.ts`
- Create: `server/src/bin/zlv.ts`
- Modify: `server/package.json`

**Interfaces:**

- Consumes:
  - `plan()` from `./lib/plan`
  - `apply()` from `./lib/apply`
  - `stats()` from `./lib/stats`
  - `Repair<any>` from `./lib/types`
  - `Command` from `@commander-js/extra-typings`
- Produces: `zlv repair list|plan|stats|apply` CLI commands.

- [ ] **Step 1: Create the repair registry**

```typescript
// server/src/scripts/repairs/index.ts
import type { Repair } from './lib/types';

// Register new repairs here — one line per repair:
// import { myRepair } from './my-repair';

export const repairs: Record<string, Repair<any>> = {
  // 'my-repair': myRepair,
};
```

- [ ] **Step 2: Create the repair subcommand**

```typescript
// server/src/scripts/repairs/cli.ts
import { Command } from '@commander-js/extra-typings';

import { apply } from './lib/apply';
import { plan } from './lib/plan';
import { stats } from './lib/stats';
import { repairs } from './index';

export function repairCommand(): Command {
  const cmd = new Command('repair').description(
    'Bulk housing data repair commands'
  );

  cmd
    .command('list')
    .description('List all registered repairs')
    .action(() => {
      const names = Object.keys(repairs);
      if (names.length === 0) {
        console.log('No repairs registered.');
        return;
      }
      names.forEach((name) => console.log(name));
    });

  cmd
    .command('plan')
    .description(
      'Generate plan.jsonl, skipped.jsonl, errors.jsonl for a repair'
    )
    .argument('<name>', 'repair name (see: zlv repair list)')
    .option('--out <dir>', 'output directory', process.cwd())
    .action(async (name, options) => {
      const repair = repairs[name];
      if (!repair) {
        console.error(
          `Unknown repair: "${name}". Run "zlv repair list" to see available repairs.`
        );
        process.exit(1);
      }
      const summary = await plan(repair, { outDir: options.out });
      console.log(`Total:    ${summary.total}`);
      console.log(`Planned:  ${summary.planned}`);
      console.log(`Skipped:  ${summary.skipped}`);
      console.log(`Errors:   ${summary.errors}`);
      console.log(`Events to delete: ${summary.eventsToDelete}`);
      console.log(`Events to create: ${summary.eventsToCreate}`);
      console.log(`\nFiles written to: ${options.out}`);
      console.log('  plan.jsonl, skipped.jsonl, errors.jsonl');
    });

  cmd
    .command('stats')
    .description('Summarise a plan file without touching the DB')
    .argument('<plan-file>', 'path to plan.jsonl')
    .action(async (planFile) => {
      const summary = await stats(planFile);
      console.log(`Planned:  ${summary.planned}`);
      console.log(`Events to delete: ${summary.eventsToDelete}`);
      console.log(`Events to create: ${summary.eventsToCreate}`);
    });

  cmd
    .command('apply')
    .description(
      'Apply a plan file atomically (single transaction, full rollback on failure)'
    )
    .argument('<plan-file>', 'path to plan.jsonl')
    .action(async (planFile) => {
      const summary = await apply(planFile);
      console.log(`Updated:         ${summary.updated}`);
      console.log(`Events deleted:  ${summary.eventsDeleted}`);
      console.log(`Events created:  ${summary.eventsCreated}`);
    });

  return cmd;
}
```

- [ ] **Step 3: Create the `zlv` binary entry point**

```typescript
// server/src/bin/zlv.ts
import { Command } from '@commander-js/extra-typings';

import { repairCommand } from '../scripts/repairs/cli';

const program = new Command('zlv')
  .description('ZLV developer CLI')
  .version('0.1.0');

program.addCommand(repairCommand());

program.parseAsync(process.argv).finally(() => process.exit());
```

- [ ] **Step 4: Add the `zlv` script to `server/package.json`**

In `server/package.json`, add to the `"scripts"` object:

```json
"zlv": "NODE_OPTIONS='--import tsx/esm' tsx src/bin/zlv.ts"
```

- [ ] **Step 5: Smoke-test the CLI**

```bash
yarn workspace @zerologementvacant/server zlv repair list
```

Expected output:

```
No repairs registered.
```

```bash
yarn workspace @zerologementvacant/server zlv repair --help
```

Expected: help text with `list`, `plan`, `stats`, `apply` subcommands listed.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/repairs/index.ts \
        server/src/scripts/repairs/cli.ts \
        server/src/bin/zlv.ts \
        server/package.json
git commit -m "feat(repairs): add zlv CLI with repair subcommand"
```

---

## Self-Review Notes

After writing: spec coverage checked.

- ✅ `Repair<H>` generic interface with `query()` + `decide()` → Task 1
- ✅ `RepairAction` with optional `update`, `createEvents`, `deleteEventIds` → Task 1
- ✅ `RepairSkip` → `skipped.jsonl` (not silently omitted) → Tasks 1, 3
- ✅ `RepairError` → `errors.jsonl` → Tasks 1, 3
- ✅ `plan` command writes 3 JSONL files + prints summary → Tasks 3, 5
- ✅ `apply` groups by payload, chunks to 1000, single transaction → Task 4
- ✅ Hard-delete of events via `deleteManyHousingEvents` → Task 2
- ✅ Optional `createEvents` → Task 4 (`insertManyHousingEvents`)
- ✅ `stats` command reads plan file without DB → Tasks 4, 5
- ✅ `list` command shows registered repairs → Task 5
- ✅ Repair registry in `index.ts` → Task 5
- ✅ `zlv` binary with commander → Task 5
- ✅ `--out` option for `plan` command → Task 5
- ✅ No streaming (deferred) — load whole file, single transaction → Task 4
