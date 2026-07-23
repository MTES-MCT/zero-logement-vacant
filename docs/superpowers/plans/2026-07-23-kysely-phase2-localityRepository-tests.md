# Kysely Migration — Phase 2: localityRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Raise `localityRepository`'s repo-test-file branch coverage from 54.54% (6/11) to ≥85% with characterization tests that pin down current Knex behavior, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/localityRepository.test.ts` (no production code). The measured gap (via `yarn nx test server -- run src/repositories/test/localityRepository.test.ts --coverage --coverage.include='src/repositories/localityRepository.ts'`, isolated from `locality-api.test.ts`'s indirect coverage) is: `get()` (lines 39-43, entirely uncovered), the `establishmentId` branch of `filterQuery` (lines 58-70, uncovered), and `update()` (lines 83-92, entirely uncovered).

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `localityRepository.ts` or any production file. If a test reveals a latent bug, assert ACTUAL behavior and report DONE_WITH_CONCERNS — do not fix behavior in this phase.
- **Framework:** Vitest only. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` (canonical root oxlint script; NOT `yarn oxlint` directly) → 0 warnings on the modified file. Vitest does NOT type-check or lint. Remove any unused import. Use only valid enum/union literals (`LocalityKind`: `'ACV' | 'PVD'`; `TaxKind`: `'TLV' | 'THLV' | 'None'`).
- **Assertions:** verify with primitive table accessors (`Localities()`, `Establishments()`) or the function's own return value, never via another repository method as ground truth. Seed fresh fixtures per `it` (the file has no `afterEach`; it relies on fresh UUIDs/geoCodes from the fixture generators for isolation).
- **Fixtures:** use existing generators `genLocalityApi(geoCode?)` and `genEstablishmentApi(...geoCodes)` from `~/test/testFixtures`, and `formatLocalityApi`/`formatEstablishmentApi` to insert. Do not invent new fixture helpers.
- **Commit messages:** English; scope `test(server)`.
- **Method:** open `localityRepository.ts` (function under test) and the existing `describe('find')` > `describe('geoCodes filter')` block (nearest sibling) and mirror its style — same imports, seeding pattern, and `Localities()`/`Establishments()` accessors.

---

### Task 1: `get()` characterization tests

**Files:**

- Modify: `server/src/repositories/test/localityRepository.test.ts`

**Interfaces:**

- Consumes: `localityRepository.get(geoCode: string): Promise<LocalityApi | null>` (`localityRepository.ts:39-43`); `Localities()` accessor and `formatLocalityApi`/`genLocalityApi` already imported at the top of the test file.
- Produces: nothing consumed by later tasks (independent).

- [x] **Step 1: Write the failing tests**

Add a new top-level `describe('get', ...)` block, as a sibling of the existing `describe('find', ...)` block (both direct children of `describe('Locality repository', ...)`):

```typescript
describe('get', () => {
  it('should return the locality matching the geoCode', async () => {
    const locality = genLocalityApi();
    await Localities().insert(formatLocalityApi(locality));

    const actual = await localityRepository.get(locality.geoCode);

    // genLocalityApi() omits `taxRate` entirely; formatLocalityApi passes an
    // explicit `undefined` through to Knex's insert, which stores NULL —
    // so the round-tripped value has an explicit `taxRate: null`, not an
    // absent key. Verified empirically against the real DB.
    expect(actual).toStrictEqual({ ...locality, taxRate: null });
  });

  it('should return null if no locality matches the geoCode', async () => {
    const actual = await localityRepository.get(genGeoCode());

    expect(actual).toBeNull();
  });
});
```

Add a new import for `genGeoCode` at the top of the file (it is not re-exported by `~/test/testFixtures`, so it must come directly from `@zerologementvacant/models/fixtures` — mirrors `server/src/repositories/test/housingRepository.test.ts:33`):

```typescript
import { genGeoCode } from '@zerologementvacant/models/fixtures';
```

- [x] **Step 2: Run tests to verify they pass**

Run: `yarn nx test server -- run src/repositories/test/localityRepository.test.ts`
Expected: all tests pass, including the 2 new ones in `describe('get')` (5 total).

- [x] **Step 3: Commit**

```bash
git add server/src/repositories/test/localityRepository.test.ts
git commit -m "test(server): characterize localityRepository.get"
```

---

### Task 2: `update()` characterization tests

**Files:**

- Modify: `server/src/repositories/test/localityRepository.test.ts`

**Interfaces:**

- Consumes: `localityRepository.update(localityApi: LocalityApi): Promise<LocalityApi>` (`localityRepository.ts:83-92`); the `tax_rate ?? db.raw('null')` branch (`localityRepository.ts:89`) needs both a defined-`taxRate` case and an undefined-`taxRate` case to close the nullish-coalescing branch.
- Produces: nothing consumed by later tasks (independent).

- [x] **Step 1: Write the failing tests**

Add a new top-level `describe('update', ...)` block, sibling of `describe('find', ...)` and `describe('get', ...)`:

```typescript
describe('update', () => {
  it('should update the tax kind and tax rate', async () => {
    const locality = genLocalityApi();
    await Localities().insert(formatLocalityApi(locality));

    const actual = await localityRepository.update({
      ...locality,
      taxKind: 'TLV',
      taxRate: 5
    });

    expect(actual).toMatchObject({
      geoCode: locality.geoCode,
      taxKind: 'TLV',
      taxRate: 5
    });
    const stored = await Localities()
      .where({ geo_code: locality.geoCode })
      .first();
    expect(stored).toMatchObject({ tax_kind: 'TLV', tax_rate: 5 });
  });

  it('should set the tax rate to null when taxRate is undefined', async () => {
    const locality = genLocalityApi();
    await Localities().insert(
      formatLocalityApi({ ...locality, taxKind: 'TLV', taxRate: 5 })
    );

    const actual = await localityRepository.update({
      ...locality,
      taxKind: 'None',
      taxRate: undefined
    });

    expect(actual.taxRate).toBeNull();
    const stored = await Localities()
      .where({ geo_code: locality.geoCode })
      .first();
    expect(stored.tax_rate).toBeNull();
  });
});
```

- [x] **Step 2: Run tests to verify they pass**

Run: `yarn nx test server -- run src/repositories/test/localityRepository.test.ts`
Expected: all tests pass, including the 2 new ones in `describe('update')` (7 total).

- [x] **Step 3: Commit**

```bash
git add server/src/repositories/test/localityRepository.test.ts
git commit -m "test(server): characterize localityRepository.update"
```

---

### Task 3: `find()` establishmentId filter characterization test

**Files:**

- Modify: `server/src/repositories/test/localityRepository.test.ts`

**Interfaces:**

- Consumes: `localityRepository.find({ filters: { establishmentId } })` going through the `else if (filters?.establishmentId)` branch of `filterQuery` (`localityRepository.ts:58-70`), which filters localities whose `geo_code` is in the establishment's `localities_geo_code` column via `Establishments()` + `db.raw('UNNEST(...)')`. `Establishments` and `formatEstablishmentApi` are already imported at the top of the test file from `../establishmentRepository`.
- Produces: nothing consumed by later tasks (independent; this is the last task).

- [x] **Step 1: Write the failing test**

Add a new `describe('establishmentId filter', ...)` block as a sibling of the existing `describe('geoCodes filter', ...)` block, inside the existing `describe('find', ...)`:

```typescript
describe('establishmentId filter', () => {
  it('should return only localities within the establishment geoCodes', async () => {
    const locality1 = genLocalityApi();
    const locality2 = genLocalityApi();
    const establishment = genEstablishmentApi(locality1.geoCode);
    await Localities().insert([
      formatLocalityApi(locality1),
      formatLocalityApi(locality2)
    ]);
    await Establishments().insert(formatEstablishmentApi(establishment));

    const result = await localityRepository.find({
      filters: { establishmentId: establishment.id }
    });

    const geoCodes = result.map((locality) => locality.geoCode);
    expect(geoCodes).toContain(locality1.geoCode);
    expect(geoCodes).not.toContain(locality2.geoCode);
  });
});
```

- [x] **Step 2: Run tests to verify they pass**

Run: `yarn nx test server -- run src/repositories/test/localityRepository.test.ts`
Expected: all tests pass (8 total).

- [x] **Step 3: Run full coverage check**

Run: `yarn nx test server -- run src/repositories/test/localityRepository.test.ts --coverage --coverage.include='src/repositories/localityRepository.ts'`
Expected: branch coverage ≥85% (all previously-uncovered lines — 39-43, 58-70, 83-92 — now covered).

- [x] **Step 4: Mandatory gates**

Run: `yarn nx typecheck server`
Expected: 0 errors.

Run: `yarn lint`
Expected: 0 warnings on `server/src/repositories/test/localityRepository.test.ts`.

- [x] **Step 5: Commit**

```bash
git add server/src/repositories/test/localityRepository.test.ts
git commit -m "test(server): characterize localityRepository find establishmentId filter"
```
