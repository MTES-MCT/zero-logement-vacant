# Kysely Migration — Phase 2: housingOwnerRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `housingOwnerRepository` branch coverage from 40% (scoped) to ≥85% with characterization tests that pin current Knex behavior, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/housingOwnerRepository.test.ts` (no production code). Most gaps are pure exported helpers (relative-location converters, format/parse) with zero DB setup; two DB-backed gaps cover `findByOwner` geoCodes filtering and `saveMany`'s empty-array guard.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `ts-pattern`, `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `housingOwnerRepository.ts` or any production file. If a test reveals a latent bug, assert the ACTUAL current behavior and report DONE_WITH_CONCERNS.
- **Framework:** Vitest only. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` (the canonical root oxlint script) → 0 warnings. Vitest does NOT type-check or lint. Remove any unused import. Use only valid enum/union literals.
- **Assertions:** verify persistence with primitive table accessors (`HousingOwners()`, `Owners()`, `Housing()`), never via the repository under test. Scope assertions so they are falsifiable.
- **Fixtures:** use existing generators (`genHousingApi`, `genOwnerApi`, `genHousingOwnerApi`) and the sibling accessors/formatters already imported by the test file. Do not invent new helpers.
- **Commit messages:** English; scope `test(server)`.
- **Phase-3 finding to document, not fix:** `findByOwner` uses `whereRaw('1 = 0')` (line ~51) to short-circuit on empty geoCodes — the only raw-SQL site, and it violates the "never raw SQL in repositories" convention. Characterize the behavior (empty result); do not change it here.
- **Method:** open `housingOwnerRepository.ts` (function under test) and `housingOwnerRepository.test.ts` (nearest sibling test) and mirror the closest existing test.

## Baseline (measured 2026-07-08, scoped to the file + its test)

Statements 67.6%, **Branches 40.0% (6/15)**, Functions 54.8%.

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/housingOwnerRepository.test.ts`.

---

## Task 1: Relative-location converters (pure, no DB)

Three exported pure functions with many uncovered `ts-pattern` arms. No DB.

**Files:** Modify `server/src/repositories/test/housingOwnerRepository.test.ts`

**Interfaces (named exports from `~/repositories/housingOwnerRepository`):** `fromRelativeLocationDBO`, `toRelativeLocationDBO`, `relativeLocationFilterToDBO`. Read each function in the source for the exact numeric codes ↔ string mapping before asserting.

- [ ] **Step 1: Write the tests** — add a `describe` per function:
  1. `fromRelativeLocationDBO` — call with each DBO value the source maps (0,1,2,3,4,5,6,7) and assert the returned `RelativeLocation` string per the source's `.with(...)` arms; call with `null` → assert `null` (covers lines 212–235 arms).
  2. `toRelativeLocationDBO` — call with each `RelativeLocation` string the source maps (including `'same-commune'`, `'other'`) and `null`; assert the numeric code / `null` per source (lines 228–235).
  3. `relativeLocationFilterToDBO` — call with every `RelativeLocationFilter` variant and assert the numeric-array result per source (e.g. `'same-address'`→[0], `'same-commune'`→[1], `'same-department'`→[2], `'same-region'`→[3], `'other-region'`→[4,5], `'foreign-country'`→[6], `'other'`→[7]) — READ the source for the exact arrays; do not trust these examples if the code differs (lines 243–254).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/housingOwnerRepository.test.ts -t "RelativeLocation"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover housingOwnerRepository relative-location converters"`

---

## Task 2: format/parse null branches (mostly pure)

**Files:** Modify `server/src/repositories/test/housingOwnerRepository.test.ts`

**Interfaces:** `parseOwnerHousingApi`, `formatHousingOwnerApi`, `formatHousingOwnersApi` (named exports); generators `genHousingApi`, `genOwnerApi`, `genHousingOwnerApi`. Read each function's input DBO/API shape before constructing inputs.

- [ ] **Step 1: Write the tests**:
  1. `parseOwnerHousingApi` locprop null — construct the DBO input with `locprop_source: null`, assert `locprop === null` (line ~ b4[1]).
  2. `parseOwnerHousingApi` relativeLocation null — construct with `locprop_relative_ban: null`, assert `relativeLocation === null` (b5[1]).
  3. `formatHousingOwnerApi` null locprop — call with `locprop: null`, assert `locprop_source === null` in the DBO (b6[1]).
  4. `formatHousingOwnersApi` without origin — `formatHousingOwnersApi(housing, [owner])` (no 3rd arg), assert every returned DBO has `origin === null` (b7). Note the function sets `start_date: new Date()` — assert with `expect.any(Date)` or ignore that field.
  5. `formatHousingOwnersApi` with origin — `formatHousingOwnersApi(housing, [owner], 'lovac')`, assert `origin === 'lovac'` and `rank === 1`.
  6. `formatHousingOwnersApi` multiple owners — call with 2+ owners, assert `rank` is assigned ordinally (1, 2, …).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/housingOwnerRepository.test.ts -t "parseOwnerHousingApi|formatHousingOwner"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover housingOwnerRepository format/parse null branches"`

---

## Task 3: findByOwner geoCodes filter + saveMany empty guard (DB)

**Files:** Modify `server/src/repositories/test/housingOwnerRepository.test.ts`

**Interfaces:** `housingOwnerRepository.findByOwner`, `housingOwnerRepository.saveMany`; accessors `HousingOwners`, `Owners`, `Housing`; generators `genHousingApi`, `genOwnerApi`, `genHousingOwnerApi`. Read `findByOwner`'s `options.geoCodes` branch and `saveMany`'s empty-array guard.

- [ ] **Step 1: Write the tests** — the three geoCodes cases must be added together (co-dependent branches):
  1. `findByOwner` geoCodes empty — seed owner + housing + housing_owner link; call `findByOwner(owner, { geoCodes: [] })`; assert empty array (exercises `whereRaw('1 = 0')`, line 51).
  2. `findByOwner` geoCodes match — call `findByOwner(owner, { geoCodes: [housing.geoCode] })`; assert the linked housing owner is returned (line 53 `whereIn`).
  3. `findByOwner` geoCodes no-match — call `findByOwner(owner, { geoCodes: ['00000'] })` (a geo code the housing does not have); assert empty array.
  4. `saveMany` empty — call `saveMany([])`; assert it returns `[]` and writes nothing (before/after count on `HousingOwners()` unchanged) — the `!housingOwners.length` guard (line 88).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/housingOwnerRepository.test.ts -t "findByOwner|saveMany"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover housingOwnerRepository findByOwner geoCodes and saveMany empty"`

---

## Task 4: Verify coverage target reached

**Files:** none (measurement + DoD gate).

- [ ] **Step 1: Measure.**

```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=json-summary --coverage.include='src/repositories/housingOwnerRepository.ts' src/repositories/test/housingOwnerRepository.test.ts
```

Read `server/coverage/coverage-summary.json` for `housingOwnerRepository.ts` branch %. Expected **≥ 85%** (from 40%).

- [ ] **Step 2: If below 85%** — read remaining uncovered lines, add the missing case(s) by the same mirroring method (no production change), re-run. Commit as `test(server): close remaining housingOwnerRepository coverage gaps`.

- [ ] **Step 3: Confirm no regressions.** `yarn nx test server -- run src/repositories/test/housingOwnerRepository.test.ts` → all green.

---

## Definition of Done

- `housingOwnerRepository.ts` branch coverage ≥ 85%; all tests green; typecheck + lint clean.
- No production code changed; the `whereRaw('1 = 0')` convention issue documented for Phase 3.
- **Review checkpoint** — stop for review before the next Phase-2 repo.
