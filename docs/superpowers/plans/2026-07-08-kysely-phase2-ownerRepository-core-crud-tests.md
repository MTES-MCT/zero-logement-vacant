# Kysely Migration — Phase 2: ownerRepository Core-CRUD Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Characterization-test the core CRUD surface of `ownerRepository` (currently 44% stmt / 54% branch — the worst-covered core repo) so the later Kysely migration can be verified green. This plan covers the core CRUD subset only; the deprecated/raw-SQL tail (`save`/`saveMany`/`searchOwners`/`updateAddressList`) is deferred to a later plan after a checkpoint.

**Architecture:** Add tests only to `server/src/repositories/test/ownerRepository.test.ts` (no production code). Mirror the existing test file's patterns and the recently-added `eventRepository.test.ts` patterns for campaign/group seeding.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), fishery factories, `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `ownerRepository.ts` or any production file. If a test reveals a latent bug, keep the test asserting the ACTUAL current behavior and report it as DONE_WITH_CONCERNS — do not fix behavior in this phase.
- **Known security bug — OUT OF SCOPE here, do NOT touch:** `updateAddressList` concatenates unescaped `postalCode`/`houseNumber` into raw SQL (injection risk). It is deferred (document-and-fix in Phase 3) and is NOT part of this plan. Do not add tests for `updateAddressList`, `save`, `saveMany`, `searchOwners`, or `escapeValue` in this plan.
- **Framework:** Vitest only, never Jest. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY type gate:** after tests pass at runtime, run `yarn nx typecheck server` and confirm ZERO type errors before committing. Vitest transpiles WITHOUT type-checking — a passing test is not proof of type-correctness (a prior task shipped an invalid enum literal only typecheck caught). Use only valid enum/union literals.
- **Assertions:** verify persistence with primitive table accessors (`Owners()`, `HousingOwners()`, …), never via the repository under test. Scope assertions by inserted id so they are falsifiable.
- **Fixtures:** use existing generators (`genOwnerApi`, `genHousingApi`, `genHousingOwnerApi`) and fishery `factories` (e.g. `factories.campaign(establishment)`). For campaign/group seeding, mirror the just-added `eventRepository.test.ts` tests. Do not invent new fixture helpers.
- **Commit messages:** English; scope `test(server)`.
- **Method of writing each test:** open `ownerRepository.ts` (the function under test) and `ownerRepository.test.ts` (the nearest existing sibling test), read the exact signature/return shape, and mirror the closest existing test — same imports, seeding, and assertion accessors.

## Baseline (measured 2026-07-08, scoped to ownerRepository.ts + its test)

Statements 43.83%, **Branches 54.45%**, Functions 39.34%, Lines 42.55%.
This plan targets the core-CRUD functions; a full ≥85% is expected only after the deferred tail plan.

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/ownerRepository.test.ts` — add `describe`/`it` blocks per function, matching the existing "one describe per function" structure.

---

## Task 1: `get`, `findOne` null path, and parseOwnerApi edge branches

**Files:** Modify `server/src/repositories/test/ownerRepository.test.ts`

**Interfaces:** `ownerRepository.get`, `ownerRepository.findOne`; accessors `Owners`; generators `genOwnerApi`; formatter `formatOwnerApi`. Read `ownerRepository.get` / `findOne` / `parseOwnerApi` signatures first.

- [ ] **Step 1: Write the tests** — add a `describe('get', …)` and extend `describe('findOne', …)`:
  1. `get` — insert an owner via `Owners().insert(formatOwnerApi(genOwnerApi()))`, call `ownerRepository.get(owner.id)`, assert it returns an `OwnerApi` matching the inserted owner (line 140–145).
  2. `get` — call `ownerRepository.get(faker.string.uuid())` (nonexistent), assert `null` (line 146 false branch).
  3. `findOne` — call `ownerRepository.findOne({ fullName: '<random unused>' })`, assert `null`.
  4. `parseOwnerApi` birth_date-as-Date — insert an owner whose `birth_date` is a JS `Date` (pass a Date to `Owners().insert(...)`), fetch via `get`, assert `birthDate` is the correct `yyyy-mm-dd` string (line 596).
  5. `parseOwnerApi` createdAt/updatedAt null — insert an owner with `created_at`/`updated_at` null, fetch via `get`, assert `createdAt === null` and `updatedAt === null` (lines 614–615 false branches).
  6. `parseOwnerApi` ban null — call `ownerRepository.find({ includes: ['banAddress'] })` for an owner with no BAN row, assert its `banAddress === null` (line 610 false branch).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts -t "get|findOne|parse"`
- [ ] **Step 3: Type gate.** `yarn nx typecheck server` → 0 errors.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover ownerRepository get, findOne null, and parse edge branches"`

---

## Task 2: `find` filter and include branches

**Files:** Modify `server/src/repositories/test/ownerRepository.test.ts`

**Interfaces:** `ownerRepository.find`; accessors `Owners`, `Housing`, `HousingOwners`, plus campaign/group accessors and `factories.campaign` (mirror `eventRepository.test.ts`). Read the `filter` and `include` helpers in `ownerRepository.ts` for the exact filter keys.

- [ ] **Step 1: Write the tests** — extend `describe('find', …)`:
  1. `idpersonne=false` — seed one owner with `idpersonne: null` and one with an idpersonne string; `find({ filters: { idpersonne: false } })` returns only the null one (line 538).
  2. `idpersonne` single string — seed owner `idpersonne: 'ABC123'`; `find({ filters: { idpersonne: 'ABC123' } })` returns exactly that owner (line 541).
  3. `idpersonne=[]` empty array — `find({ filters: { idpersonne: [] } })` applies no idpersonne filter (returns owners regardless) — the `value.length > 0` guard false branch (lines 544–545).
  4. `campaignId` — seed housing + owner + housing_owner link + campaign + campaign_housing (mirror eventRepository campaign seeding); `find({ filters: { campaignId: campaign.id } })` returns only the linked owner (lines 552–567).
  5. `groupId` — seed housing + owner + housing_owner + group + groups_housing; `find({ filters: { groupId: group.id } })` returns only the linked owner (lines 571–586).
  6. `include('housings')` — seed owner + housing + housing_owner link; `find({ includes: ['housings'] })` returns the owner with a non-null `housings` array containing the linked housing (lines 507–520).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts -t "find"`
- [ ] **Step 3: Type gate.** `yarn nx typecheck server` → 0 errors.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover ownerRepository find filter and include branches"`

---

## Task 3: housing-owner links — findByHousing, insertHousingOwners, deleteHousingOwners

**Files:** Modify `server/src/repositories/test/ownerRepository.test.ts`

**Interfaces:** `ownerRepository.findByHousing`, `ownerRepository.insertHousingOwners`, `ownerRepository.deleteHousingOwners`; accessors `Owners`, `Housing`, `HousingOwners`; generators `genHousingApi`, `genOwnerApi`, `genHousingOwnerApi`. Read the three signatures + `parseHousingOwnerApi`.

- [ ] **Step 1: Write the tests** — add `describe` blocks per function:
  1. `findByHousing` — seed owner + housing + housing_owner link; `findByHousing(housing)` returns an array containing the linked owner as `HousingOwnerApi` (lines 255–269). This also exercises `parseHousingOwnerApi`.
  2. `parseHousingOwnerApi` locprop null — ensure the seeded housing_owner has `locprop_source` null; assert the returned `HousingOwnerApi` has `locprop === null` (line 634 branch).
  3. `insertHousingOwners` — seed owner + housing; build `HousingOwnerApi[]` via `genHousingOwnerApi(housing, owner)`; call `insertHousingOwners(housingOwners)`; assert rows appear in `HousingOwners()` scoped by owner/housing id (lines 422–439).
  4. `deleteHousingOwners` — seed a housing_owner link; call `deleteHousingOwners(housingId, [ownerId])`; assert the row is gone from `HousingOwners()` and the return value matches current behavior (lines 447–454).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts -t "findByHousing|insertHousingOwners|deleteHousingOwners"`
- [ ] **Step 3: Type gate.** `yarn nx typecheck server` → 0 errors.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover ownerRepository housing-owner link read/write"`

---

## Task 4: modern writes — insert, update, betterSave, betterSaveMany

**Files:** Modify `server/src/repositories/test/ownerRepository.test.ts`

**Interfaces:** `ownerRepository.insert`, `ownerRepository.update`, `ownerRepository.betterSave`, `ownerRepository.betterSaveMany`; accessors `Owners`; generators `genOwnerApi`. Read each signature — `betterSave`/`betterSaveMany` take conflict options (`{ onConflict, merge }`); read the exact shape and reuse the same conflict key the code expects.

- [ ] **Step 1: Write the tests** — add `describe` blocks per function:
  1. `insert` — build `genOwnerApi()`, call `insert(owner)`, assert the returned `OwnerApi` matches and the row is persisted via `Owners().where({ id: result.id }).first()` (lines 273–283).
  2. `update` — insert an owner, modify a field (e.g. `email`), call `update(modifiedOwner)`, assert the returned `OwnerApi` reflects the change and the DB row is updated (lines 400–415).
  3. `betterSave` — insert an owner, then call `betterSave(updatedOwner, { onConflict: [...], merge: [...] })` with the same conflict key; assert the row is updated (not duplicated) — one row for that key (lines 297–298).
  4. `betterSaveMany` non-empty — generate several owners, call `betterSaveMany(owners, opts)`, assert all persisted (lines 305–314).
  5. `betterSaveMany` empty — call `betterSaveMany([], opts)`, assert it resolves and writes nothing (line 306 early-return branch). Use a before/after count on `Owners()`.

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts -t "insert|update|betterSave"`
- [ ] **Step 3: Type gate.** `yarn nx typecheck server` → 0 errors.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover ownerRepository insert, update, betterSave(Many)"`

---

## Task 5: Coverage checkpoint (measure, do not gate at 85%)

**Files:** none (measurement).

- [ ] **Step 1: Measure.**

```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=json-summary --coverage.include='src/repositories/ownerRepository.ts' src/repositories/test/ownerRepository.test.ts
```

Read `server/coverage/coverage-summary.json` for `ownerRepository.ts` branch %. Record the new branch/stmt/func/line %.

- [ ] **Step 2: Report the delta and the remaining tail.** Note how far core-CRUD got us from the 54% baseline, and confirm the remaining gap is concentrated in the deferred tail (`save`/`saveMany`/`searchOwners`/`updateAddressList`/`escapeValue`). This is the checkpoint deliverable — the tail is a separate plan.

- [ ] **Step 3: Confirm no regressions.** `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts` → all green, output pristine.

---

## Definition of Done

- Tasks 1–4 committed; all ownerRepository tests green; `yarn nx typecheck server` clean.
- No production code changed; the deferred tail (incl. the `updateAddressList` injection) untouched and still logged for Phase 3.
- **Review checkpoint** — stop and report intermediate coverage; decide whether to do the deprecated/raw-SQL tail next or move to the next repo.
