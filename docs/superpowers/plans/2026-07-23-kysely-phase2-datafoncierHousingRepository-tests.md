# Kysely Migration — Phase 2: datafoncierHousingRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Raise `datafoncierHousingRepository`'s branch coverage from 40% (2/5) to 100% with characterization tests, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/datafoncierHousingRepository.test.ts` (no production code). The only untested surface was `find()` (the plural list method) — `findOne()` already had one passing test. `find()` is never actually called in production (`grep`-confirmed: only `findOne({idlocal})` is called, from `housingController.ts` and `datafoncierHousingController.ts`), but it's public API and worth characterizing regardless.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `datafoncierHousingRepository.ts` in this phase.
- **Found latent bug, documented not fixed:** `DatafoncierHousingFilters.idpropcte` is a typo — the real field/column is `idprocpte` (confirmed via `grep` across the whole codebase: every other reference uses `idprocpte`; `idpropcte` appears nowhere else and no caller ever passes it). Passing it today would crash with a Postgres "column idpropcte does not exist" error, since Knex's `.where(object)` treats object keys as literal column names. Not tested (unreachable in practice) and not fixed in this phase.
- **Full-object assertions matter here:** this table has ~130 columns. A test that only checks 2-3 fields (as the pre-existing test did) will NOT catch a camelCase/snake_case key-casing regression during the Kysely migration — the `DatafoncierHousing` type has many multi-word snake_case fields (`ban_id`, `ban_type`, `dis_ban_ff`, `rnb_id`, …) beyond the 3 geometry fields. Assert full-object equality (`toEqual(fixtureObject)`) in at least one test, not just `toMatchObject` on a subset.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings on the modified file.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: `find()` characterization tests + full-object regression guard

**Files:**

- Modify: `server/src/repositories/test/datafoncierHousingRepository.test.ts`

- [x] **Step 1: Add `find()` tests** — matching filter, empty result, and no-filter-at-all (closes the `if (where)` branch in `find`).
- [x] **Step 2: Add a `findOne` not-found test** (`should return null if no datafoncier housing matches`).
- [x] **Step 3: Strengthen the existing `findOne` "should find" test** with `expect(actual).toEqual(datafoncierHousing)` (full-object equality), in addition to the existing `toMatchObject` geometry-field check.
- [x] **Step 4: Run and verify 100% coverage**

Run: `yarn nx test server -- run src/repositories/test/datafoncierHousingRepository.test.ts --coverage --coverage.include='src/repositories/datafoncierHousingRepository.ts'`
Result: 100% statements/branches/functions/lines (5 tests).

- [x] **Step 5: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 6: Commit**

```bash
git add server/src/repositories/test/datafoncierHousingRepository.test.ts
git commit -m "test(server): characterize datafoncierHousingRepository find and full row shape"
```
