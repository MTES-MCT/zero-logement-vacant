# Kysely Migration — Phase 3: datafoncierOwnersRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `datafoncierOwnersRepository`'s `count`/`findDatafoncierOwners` from Knex to Kysely, verified green against the Phase 2 characterization tests, and remove the confirmed-dead `hasAddress`/`hasName` exports.

**Architecture:** Keep `datafoncierOwnersTable`/`DatafoncierOwners()` (Knex accessor) unchanged for test/seed backward compat. Reuses the same two techniques documented in the `datafoncierHousingRepository` Phase 3 plan (same `df_owners_nat_2024` digit-boundary table-name issue, same generic `Record.mapKeys(row, camelToSnake)` full-row conversion) — both applied cleanly on the first attempt this time.

One behavioral simplification: the original `count()` built a `DISTINCT ON (idpersonne) SELECT idpersonne ... WHERE ccogrm IS NULL OR ccogrm IN (...)` subquery, then wrapped it in `SELECT COUNT(*) FROM (subquery) sub`. This is mathematically equivalent to `SELECT COUNT(DISTINCT idpersonne) WHERE ...` — both count the number of distinct `idpersonne` values matching the `ccogrm` condition — so the migration uses Kysely's native `eb.fn.count('idpersonne').distinct()` directly instead of replicating the subquery structure. Verified against the Phase 2 characterization tests (which exercise both the filter and the distinct-count behavior with duplicate `idpersonne` rows).

**Dead code removed:** `hasAddress()` and `hasName()` — standalone exported functions returning `Knex.QueryBuilder` modifiers, confirmed via repo-wide `grep` to have zero callers anywhere, including tests. Kept in Phase 2 as untested/undeleted; removed here since migrating dead Knex-typed helpers to Kysely for an audience of zero callers serves no purpose.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), `effect`/`effect/String` (`Record.mapKeys`, `camelToSnake`), Knex (kept only for the `DatafoncierOwners()` test/seed accessor), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the Phase 2 tests must pass UNCHANGED against the migrated code.
- **`idprocpte` here is correctly spelled** (unlike `datafoncierHousingRepository`'s `idpropcte` typo) — no dead-field caveat needed.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) `housing-api.test.ts` green (the controller test suite exercising this repo via `housingController.ts`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate `count`/`findDatafoncierOwners` to Kysely, remove dead exports

**Files:**

- Modify: `server/src/repositories/datafoncierOwnersRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `count()`/`findDatafoncierOwners()`/`parseDatafoncierOwnerRow()`, removing `hasAddress`/`hasName`.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/datafoncierOwnersRepository.test.ts`
Result: 7/7 pass on the first attempt (both documented gotchas applied cleanly from the start).

- [x] **Step 3: Run the controller test suite**

Run: `yarn nx test server -- run src/controllers/test/housing-api.test.ts`
Result: 65/65 pass.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/datafoncierOwnersRepository.ts
git commit -m "feat(server): migrate datafoncierOwnersRepository to Kysely"
```
