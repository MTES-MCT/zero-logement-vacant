# Kysely Migration — Phase 2: documentRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `documentRepository` branch coverage from 63% to ≥85% (→100% reachable) with characterization tests, and additionally characterize the untested raw-SQL `joinDocumentWithCreator` helper (migration-risk surface), before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/documentRepository.test.ts` (no production code). Gaps split into: pure converter branches (`toDocumentDBO`/`fromDocumentDBO`), `find`/`findOne` filter + soft-delete branches, and the entirely-uncovered `joinDocumentWithCreator` raw-SQL left-join.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `documentRepository.ts` or any production file. If a test reveals a latent bug, assert ACTUAL behavior and report DONE_WITH_CONCERNS.
- **Framework:** Vitest only. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` (canonical root oxlint script; NOT `yarn oxlint` directly) → 0 warnings on the modified file. Remove any unused import. Use only valid enum/union literals.
- **Assertions:** verify with primitive table accessors (`Documents()`, `Establishments()`, `Users()`) or the method's return value scoped by id — never via the repository under test's other methods for ground-truth reads. Seed fresh fixtures per `it`.
- **Fixtures:** use existing generators (`genDocumentApi`, `genUserApi`, `genEstablishmentApi`) mirroring the existing test file (establishment+user in `beforeAll`).
- **Commit messages:** English; scope `test(server)`.
- **Phase-3 note (document, do not fix):** `fromDocumentDBO`'s `!dbo.creator` guard is defensive and unreachable via the public API (the creator join is INNER) — the pure unit test (Task 1) covers the throw branch by direct call.
- **Method:** open `documentRepository.ts` (functions under test) and `documentRepository.test.ts` (existing sibling tests) and mirror the closest existing test.

## Baseline (measured 2026-07-08, scoped)

Statements 83%, **Branches 63% (17/27)**, Functions 93%. Note: `joinDocumentWithCreator`'s `CASE WHEN` is inside a raw-SQL string, so it is NOT one of the 27 JS branches — Tasks 1+2 alone reach ~100% branch; Task 3 raises statement/function coverage of the raw-SQL helper.

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/documentRepository.test.ts`.

---

## Task 1: Pure converter branches — toDocumentDBO / fromDocumentDBO (no DB)

Closes branches 9,10,11,12,13. Pure functions, no DB.

**Files:** Modify `server/src/repositories/test/documentRepository.test.ts`

**Interfaces:** `toDocumentDBO`, `fromDocumentDBO` (named exports — confirm `fromDocumentDBO` is exported; if not, cover its branches through `findOne`/`find` in Task 2 instead and note it). Read both functions' input/output shapes and the exact throw message.

- [ ] **Step 1: Write the tests** — add `describe` blocks:
  1. `toDocumentDBO` with `updatedAt` a `Date` → assert `updated_at` is the `toDateDBO` output (non-null) (branch 9, line 211).
  2. `toDocumentDBO` with `deletedAt` a `Date` → assert `deleted_at` non-null (branch 10, line 212).
  3. `fromDocumentDBO` with `creator` null → assert it throws `Error('Creator not fetched')` (branch 11, line 217).
  4. `fromDocumentDBO` with `updated_at` set → assert `updatedAt` is a non-null `Date` (branch 12, line 230).
  5. `fromDocumentDBO` with `deleted_at` set → assert `deletedAt` is a non-null `Date` (branch 13, line 231).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/documentRepository.test.ts -t "toDocumentDBO|fromDocumentDBO"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings on the modified file.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover documentRepository converter date/creator branches"`

---

## Task 2: find / findOne filter + soft-delete branches (DB)

Closes branches 2,3,5,6,7.

**Files:** Modify `server/src/repositories/test/documentRepository.test.ts`

**Interfaces:** `documentRepository.findOne`, `documentRepository.find`, `documentRepository.remove` (for soft-delete setup); accessors `Documents`, `Establishments`; generators `genDocumentApi`, `genEstablishmentApi`. Read `findOne`/`find`'s options shape (`filters.deleted`, `filters.ids`, `filters.establishmentIds`).

- [ ] **Step 1: Write the tests**:
  1. `findOne` `deleted: true` — soft-delete a document (via `remove` or `Documents().update({ deleted_at })`), call `findOne(id, { filters: { deleted: true } })` → returns the soft-deleted doc; also call on a non-deleted doc with `deleted: true` → null (branch 2, `whereNotNull`).
  2. `findOne` `deleted: false` — call on a soft-deleted doc with `deleted: false` → null; on a live doc → returned (branch 3, `whereNull`).
  3. `find` with no `ids` filter — call `find({ filters: { establishmentIds: [establishment.id] } })` (no `ids`) → returns the establishment's docs (branch 5 else).
  4. `find` `establishmentIds` — seed docs from two establishments; `find({ filters: { establishmentIds: [establishment.id] } })` → only that establishment's doc (branch 6, `whereIn`).
  5. `find` `deleted: false` — soft-delete a doc; `find({ filters: { deleted: false } })` → the deleted doc is absent (branch 7, `whereNull`).

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/documentRepository.test.ts -t "findOne|find"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings on the modified file.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover documentRepository find/findOne filter and soft-delete branches"`

---

## Task 3: joinDocumentWithCreator raw-SQL left-join (migration-critical)

Characterizes the entirely-uncovered `joinDocumentWithCreator` (a `db.raw` CASE/`jsonb_build_object` left-join). Not required for the branch gate, but the raw SQL is exactly the migration-risk surface — pin its behavior now.

**Files:** Modify `server/src/repositories/test/documentRepository.test.ts`

**Interfaces:** `joinDocumentWithCreator` (named export). Read its signature — it mutates a `Knex.QueryBuilder`, taking (query, the FK column to join on, an alias). Find a real parent table that has a document FK column to drive the join. `housing_documents.document_id` is a natural candidate (the `HousingDocuments()` accessor + `housingDocumentRepository` link a housing to a document); read `housingDocumentRepository.ts`/its migration to confirm the column name and how to seed a row.

- [ ] **Step 1: Write the test**:
  1. Seed a document (with a creator) and a parent row referencing it (e.g. a `housing_documents` row via the `HousingDocuments()` accessor, or the simplest real parent table with a document FK). Build a Knex query on that parent table, call `joinDocumentWithCreator(query, '<parent.document_fk>', '<alias>')`, execute it, and assert the result row carries the aliased document JSON (id + nested creator) per the `jsonb_build_object` shape. If wiring a parent table proves infeasible, report DONE_WITH_CONCERNS with the specific blocker rather than forcing a brittle test.

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/documentRepository.test.ts -t "joinDocumentWithCreator"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings on the modified file.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover documentRepository joinDocumentWithCreator raw join"`

---

## Task 4: Verify coverage target reached

**Files:** none (measurement + DoD gate).

- [ ] **Step 1: Measure.**
```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=json-summary --coverage.include='src/repositories/documentRepository.ts' src/repositories/test/documentRepository.test.ts
```
Read `server/coverage/coverage-summary.json` for `documentRepository.ts` branch %. Expected **≥ 85%** (from 63%). Note statement/function % too (Task 3 should push them toward 100%).

- [ ] **Step 2: If branch < 85%** — read remaining uncovered lines, add the missing case(s) by the same mirroring method (no production change), re-run. Commit as `test(server): close remaining documentRepository coverage gaps`.

- [ ] **Step 3: Confirm no regressions.** `yarn nx test server -- run src/repositories/test/documentRepository.test.ts` → all green.

---

## Definition of Done

- `documentRepository.ts` branch coverage ≥ 85%; all tests green; typecheck + lint clean.
- `joinDocumentWithCreator` raw-SQL join characterized (or the blocker documented via DONE_WITH_CONCERNS).
- No production code changed; the defensive `!dbo.creator` guard documented for Phase 3.
- **Review checkpoint** — stop for review before the next Phase-2 repo.
