# Knex → Kysely Migration — Step 1: Transaction Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single `startTransaction` open a Knex *and* a Kysely transaction that commit/roll back together, so a logical transaction spanning both engines is atomic — fixing the `precisionController` split-brain bug and unblocking safe incremental migration.

**Architecture:** `startTransaction` wraps a Knex transaction inside a Kysely `.transaction().execute()` block, seeding both `AsyncLocalStorage` stores. Knex repos keep reading the Knex store via `getTransaction`; Kysely repos keep reading the Kysely store via `getKyselyTransaction`. Both stores are now populated by the one entry point, so ambient-transaction reuse works for either engine.

**Tech Stack:** TypeScript, Knex, Kysely (`pg`), Vitest (real Postgres integration tests), `node:async_hooks` `AsyncLocalStorage`.

## Global Constraints

- **Framework:** Vitest only, never Jest. Tests hit a real Postgres (`.env.test` → `test_feat_kysely_setup_rwr`); the DB must be running.
- **Run tests via:** `yarn nx test server -- run <path>` (nx forwards args after `--` to vitest).
- **Commit messages:** English; workspace-level scope `feat(server)` / `test(server)`.
- **Disjoint-table invariant:** a single logical operation must not write the *same rows* through both engines (two connections → self-deadlock). Keep each operation's Knex-side and Kysely-side writes on different tables.
- **Do not change** the public signatures of `getTransaction`, `withinTransaction`, `getKyselyTransaction`, `withinKyselyTransaction`, or `startKyselyTransaction`.
- **Commit ordering (residual window, accepted):** commit Knex first, then let Kysely commit on callback return. If Knex commits and Kysely commit then fails, state is inconsistent — irreducible two-connection commit-time window, removed in the final Knex-removal step.

---

## Roadmap (context — only Step 1 is detailed below)

- **Step 1 — Transaction bridge** ← this plan. Fixes the live precision bug; enables safe coexistence.
- **Phase 2 — Characterization tests**, one repo per PR (own plan each): `event` → `owner` → `housingOwner` → `housingDocument` → `document` → `campaignHousing`, target ~85%+ branch.
- **Phase 3 — Incremental migration**, one repo per PR (own plan each): `note → document → housingDocument → housingOwner → owner`, then `sender → campaignHousing → campaignDraft → draft → group → campaign`, then `housing`, then `event` last.
- **Step final — Remove Knex**: delete the Knex store + bridge's Knex half, drop the `knex` dep, reduce `startTransaction` to Kysely-only.

Each step ends at a review checkpoint before the next begins.

---

## File Structure (Step 1)

- **Modify:** `server/src/infra/database/kysely-transaction.ts` — add a `runWithinKyselyTransaction(trx, cb)` primitive that runs a callback with the Kysely store seeded by an externally-created transaction.
- **Modify:** `server/src/infra/database/transaction.ts` — rewrite `startTransaction` as the dual-engine bridge. `getTransaction` / `withinTransaction` unchanged.
- **Modify (tests):** `server/src/infra/database/test/transaction.test.ts` — add cross-engine success + rollback tests alongside the existing Knex tests.
- **Create (test):** `server/src/infra/database/test/transaction-bridge-precision.test.ts` — domain regression proving `precisionRepository.link` inside `startTransaction` rolls back on failure.

---

## Task 1: Kysely store primitive `runWithinKyselyTransaction`

Adds the low-level hook the bridge needs: run a callback with the Kysely `AsyncLocalStorage` seeded by a transaction the *caller* created (the bridge creates it, not `kysely.transaction()`).

**Files:**
- Modify: `server/src/infra/database/kysely-transaction.ts`
- Test: `server/src/infra/database/test/kysely-transaction.test.ts` (create)

**Interfaces:**
- Consumes: `kysely` from `~/infra/database/kysely`; `Transaction<DB>` from `kysely`.
- Produces: `runWithinKyselyTransaction<R>(trx: Transaction<DB>, cb: () => Promise<R>): Promise<R>` — seeds the Kysely store with `trx` for the duration of `cb`. `getKyselyTransaction()` returns `trx` inside `cb`.

- [ ] **Step 1: Write the failing test**

Create `server/src/infra/database/test/kysely-transaction.test.ts`:

```ts
import { kysely } from '~/infra/database/kysely';
import {
  getKyselyTransaction,
  runWithinKyselyTransaction
} from '~/infra/database/kysely-transaction';

describe('runWithinKyselyTransaction', () => {
  it('exposes the supplied transaction via getKyselyTransaction', async () => {
    const seen = await kysely.transaction().execute((trx) =>
      runWithinKyselyTransaction(trx, async () => getKyselyTransaction())
    );

    expect(seen).toBeDefined();
  });

  it('restores no ambient transaction after the callback', async () => {
    await kysely.transaction().execute((trx) =>
      runWithinKyselyTransaction(trx, async () => undefined)
    );

    expect(getKyselyTransaction()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test server -- run src/infra/database/test/kysely-transaction.test.ts`
Expected: FAIL — `runWithinKyselyTransaction is not a function` / import has no such export.

- [ ] **Step 3: Add the primitive**

In `server/src/infra/database/kysely-transaction.ts`, add after the existing `getKyselyTransaction` export (reuse the existing module-level `storage`):

```ts
export function runWithinKyselyTransaction<R>(
  transaction: Transaction<DB>,
  cb: () => Promise<R>
): Promise<R> {
  return storage.run({ transaction }, cb);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test server -- run src/infra/database/test/kysely-transaction.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/infra/database/kysely-transaction.ts \
        server/src/infra/database/test/kysely-transaction.test.ts
git commit -m "feat(server): add runWithinKyselyTransaction store primitive"
```

---

## Task 2: Dual-engine `startTransaction` bridge

Rewrites `startTransaction` to open both engines' transactions, seed both stores, and commit/roll back as a unit.

**Files:**
- Modify: `server/src/infra/database/transaction.ts`
- Test: `server/src/infra/database/test/transaction.test.ts` (add cases; keep existing ones)

**Interfaces:**
- Consumes: `db` from `~/infra/database`; `kysely` from `~/infra/database/kysely`; `runWithinKyselyTransaction` from Task 1; existing Knex `storage`, `getTransaction`.
- Produces: `startTransaction<R>(cb, options?)` unchanged signature, now dual-engine. Inside `cb`, both `getTransaction()` (Knex) and `getKyselyTransaction()` (Kysely) return live transactions on the same logical unit.

- [ ] **Step 1: Write the failing cross-engine tests**

Append to `server/src/infra/database/test/transaction.test.ts`. Add these imports at the top of the file:

```ts
import { sql } from 'kysely';

import { kysely } from '~/infra/database/kysely';
import { getKyselyTransaction } from '~/infra/database/kysely-transaction';
```

Add this block inside the top-level `describe('Transaction', ...)`, after the existing tests (it reuses the existing `t1`/`t2` temp tables and their `beforeAll`/`afterAll`):

```ts
describe('cross-engine (Knex + Kysely)', () => {
  it('commits Knex and Kysely writes together', async () => {
    const knexId = faker.string.uuid();
    const kyselyId = faker.string.uuid();

    await startTransaction(async () => {
      const knexTrx = getTransaction();
      const kyselyTrx = getKyselyTransaction();
      if (!knexTrx || !kyselyTrx) {
        throw new Error('Both transactions should be defined');
      }
      await knexTrx('t1').insert({ id: knexId });
      await sql`insert into t2 (id) values (${kyselyId})`.execute(kyselyTrx);
    });

    const knexRow = await db('t1').where({ id: knexId }).first();
    const kyselyRow = await db('t2').where({ id: kyselyId }).first();
    expect(knexRow).toBeDefined();
    expect(kyselyRow).toBeDefined();
  });

  it('rolls back the Kysely write when the Knex write fails', async () => {
    const kyselyId = faker.string.uuid();

    await expect(
      startTransaction(async () => {
        const knexTrx = getTransaction();
        const kyselyTrx = getKyselyTransaction();
        if (!knexTrx || !kyselyTrx) {
          throw new Error('Both transactions should be defined');
        }
        await sql`insert into t2 (id) values (${kyselyId})`.execute(kyselyTrx);
        // Violates NOT NULL on the primary key → aborts the unit.
        await knexTrx('t1').insert({ id: null });
      })
    ).rejects.toThrow();

    const kyselyRow = await db('t2').where({ id: kyselyId }).first();
    expect(kyselyRow).toBeUndefined();
  });

  it('rolls back the Knex write when the Kysely write fails', async () => {
    const knexId = faker.string.uuid();

    await expect(
      startTransaction(async () => {
        const knexTrx = getTransaction();
        const kyselyTrx = getKyselyTransaction();
        if (!knexTrx || !kyselyTrx) {
          throw new Error('Both transactions should be defined');
        }
        await knexTrx('t1').insert({ id: knexId });
        await sql`insert into t2 (id) values (${null})`.execute(kyselyTrx);
      })
    ).rejects.toThrow();

    const knexRow = await db('t1').where({ id: knexId }).first();
    expect(knexRow).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `yarn nx test server -- run src/infra/database/test/transaction.test.ts -t "cross-engine"`
Expected: FAIL — `getKyselyTransaction()` returns `undefined` inside `startTransaction` (Kysely store not seeded), so the guard throws "Both transactions should be defined".

- [ ] **Step 3: Rewrite `startTransaction` as the bridge**

Replace the `startTransaction` function in `server/src/infra/database/transaction.ts`. Add imports at the top:

```ts
import { kysely } from '~/infra/database/kysely';
import { runWithinKyselyTransaction } from '~/infra/database/kysely-transaction';
```

Replace the existing `startTransaction` implementation with:

```ts
export async function startTransaction<R>(
  cb: () => AsyncOrSync<R>,
  options?: Knex.TransactionConfig
): Promise<R> {
  // One logical transaction spanning both engines: a Knex transaction nested
  // inside a Kysely transaction. Both AsyncLocalStorage stores are seeded so
  // repos on either engine join this unit. Knex commits first; Kysely commits
  // as this callback resolves. Any error rolls back both.
  return kysely.transaction().execute(async (kyselyTransaction) => {
    const transaction = await db.transaction(options);
    let result: R;
    try {
      result = await storage.run({ transaction }, () =>
        runWithinKyselyTransaction(kyselyTransaction, async () => cb())
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await transaction.commit();
    return result;
  });
}
```

Leave `getTransaction` and `withinTransaction` unchanged.

- [ ] **Step 4: Run the whole transaction test file to verify all pass**

Run: `yarn nx test server -- run src/infra/database/test/transaction.test.ts`
Expected: PASS — the 3 pre-existing Knex tests plus the 3 new cross-engine tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/infra/database/transaction.ts \
        server/src/infra/database/test/transaction.test.ts
git commit -m "feat(server): make startTransaction a dual-engine Knex+Kysely bridge"
```

---

## Task 3: Domain regression — precision link rolls back

Proves the exact reported bug is fixed: a `precisionRepository.link` (Kysely) call inside a Knex-initiated `startTransaction` now participates in the shared unit and rolls back on failure, instead of committing independently.

**Files:**
- Create: `server/src/infra/database/test/transaction-bridge-precision.test.ts`

**Interfaces:**
- Consumes: `startTransaction` (Task 2); `precisionRepository`, `Precisions`, `HousingPrecisions` from `~/repositories/precisionRepository`; `Housing`, `formatHousingRecordApi` from `~/repositories/housingRepository`; `genHousingApi` from `~/test/testFixtures`.

- [ ] **Step 1: Write the failing regression test**

Create `server/src/infra/database/test/transaction-bridge-precision.test.ts`:

```ts
import { faker } from '@faker-js/faker/locale/fr';

import { startTransaction } from '~/infra/database/transaction';
import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import precisionRepository, {
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import { genHousingApi } from '~/test/testFixtures';

describe('Transaction bridge — precision link atomicity', () => {
  let housing: HousingApi;

  beforeEach(async () => {
    housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
  });

  it('rolls back the Kysely precision link when the surrounding transaction fails', async () => {
    const referential = await Precisions();
    const precisions = faker.helpers.arrayElements(referential, 2);

    await expect(
      startTransaction(async () => {
        await precisionRepository.link(housing, precisions);
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const actual = await HousingPrecisions().where({
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    expect(actual).toHaveLength(0);
  });

  it('commits the precision link when the surrounding transaction succeeds', async () => {
    const referential = await Precisions();
    const precisions = faker.helpers.arrayElements(referential, 2);

    await startTransaction(async () => {
      await precisionRepository.link(housing, precisions);
    });

    const actual = await HousingPrecisions().where({
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    expect(actual).toHaveLength(precisions.length);
  });
});
```

- [ ] **Step 2: Run the test to verify the regression case fails on unbridged behavior**

Run: `yarn nx test server -- run src/infra/database/test/transaction-bridge-precision.test.ts`
Expected with the bridge from Task 2 in place: PASS (2 tests). To confirm the test is meaningful, temporarily `git stash` Task 2's change to `transaction.ts` and rerun — the rollback case FAILs (row count 2, not 0) because `link` committed on its own connection. Restore with `git stash pop`.

- [ ] **Step 3: (No implementation)** — the fix is Task 2; this task only adds the guard test.

- [ ] **Step 4: Run the full database test folder to confirm no regressions**

Run: `yarn nx test server -- run src/infra/database/test`
Expected: PASS across the folder.

- [ ] **Step 5: Commit**

```bash
git add server/src/infra/database/test/transaction-bridge-precision.test.ts
git commit -m "test(server): regression for precision link rollback under the bridge"
```

---

## Step 1 Definition of Done

- `startTransaction` opens both a Knex and a Kysely transaction; both stores are seeded; both commit/roll back as a unit.
- New cross-engine tests (generic + precision domain) pass; the 3 pre-existing Knex transaction tests still pass.
- `getTransaction`, `withinTransaction`, `getKyselyTransaction`, `withinKyselyTransaction`, `startKyselyTransaction` signatures unchanged.
- **Review checkpoint** — stop here for review before Phase 2.

Optional broader safety net before opening the PR:

Run: `yarn nx test server`
Expected: full suite green (one known-unrelated `housingRepository` occupancy-filter failure may pre-exist on this branch — confirm it is not newly introduced by this step).
