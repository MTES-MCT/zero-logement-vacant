# Kysely Migration — Phase 2: housingDocumentRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `housingDocumentRepository` branch coverage from 52.6% to ≥85% (→100% is reachable) with characterization tests, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/housingDocumentRepository.test.ts` (no production code). The entire gap is the untested `find` function (all filter + soft-delete branches, the `json_build_object` raw SQL) plus the `fromHousingDocumentDBO` throw path.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `housingDocumentRepository.ts` or any production file. If a test reveals a latent bug, assert ACTUAL behavior and report DONE_WITH_CONCERNS.
- **Framework:** Vitest only. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` (canonical root oxlint script; NOT `yarn oxlint` directly) → 0 warnings on the modified file. Remove any unused import. Use only valid enum/union literals.
- **Assertions:** verify persistence/results with primitive table accessors (`HousingDocuments()`, `Documents()`, `Housing()`, `Users()`) or the `find` return value scoped by id — never assert via the repository under test's other methods. Seed fresh UUID fixtures per `it` (the file has no afterEach; it relies on UUID uniqueness).
- **Fixtures:** use existing generators (`genEstablishmentApi`, `genHousingApi`, `genHousingDocumentApi`, `genUserApi`) mirroring the existing test file. Do not invent new helpers.
- **Commit messages:** English; scope `test(server)`.
- **Phase-3 note (document, do not fix):** the `!dbo.creator` guard in `fromHousingDocumentDBO` (line ~222) may be dead code — `listQuery` uses an INNER JOIN on users, so a missing user yields no row rather than a null creator. The unit test (Task 1, scenario 7) covers the throw branch by calling the function directly with a null creator; do not change the guard.
- **Method:** open `housingDocumentRepository.ts` (functions under test) and `housingDocumentRepository.test.ts` (existing sibling tests, esp. the `get` block) and mirror the closest existing test.

## Baseline (measured 2026-07-08, scoped)

Statements 72.9%, **Branches 52.6% (10/19)**, Functions 83.3%.

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/housingDocumentRepository.test.ts`.

---

## Task 1: `find` filter/soft-delete branches + `fromHousingDocumentDBO` throw

Covers all 9 uncovered branch arms across `find` (documentIds, housingIds, deleted=true, deleted=false, no-filter fallthrough) and the `fromHousingDocumentDBO` throw path.

**Files:** Modify `server/src/repositories/test/housingDocumentRepository.test.ts`

**Interfaces:** `housingDocumentRepository.find`, `fromHousingDocumentDBO` (named export); accessors `HousingDocuments`, `Documents`, `Housing`, `Users`; generators `genHousingApi`, `genHousingDocumentApi`, `genUserApi` (+ the `establishment`/`user` seeded in the file's `beforeAll`). Read `find`'s `FindOptions` shape (especially the `housingIds` composite `{ geoCode, id }` and the `deleted` filter) and `fromHousingDocumentDBO`'s DBO input shape in the source before writing.

- [ ] **Step 1: Write the tests** — add a `describe('find', …)` block (and one `it` for the throw):
  1. `find` no options — seed housing + document + link; `find()` returns the linked document with correct `housingId`, `housingGeoCode`, populated `creator` (exercises all filter falsy arms + the `json_build_object` raw SQL).
  2. `find` by `documentIds` — seed two doc-housing links; `find({ filters: { documentIds: [id1] } })` returns only the matching one (branch 3).
  3. `find` by `housingIds` — seed documents on two housings; `find({ filters: { housingIds: [{ geoCode, id }] } })` returns only the specified housing's doc (branch 4, composite key).
  4. `find` `deleted: true` — seed one live + one soft-deleted document (set `deleted_at` via `Documents().update(...)`); `find({ filters: { deleted: true } })` returns only the soft-deleted one (branch 5, `whereNotNull`).
  5. `find` `deleted: false` — same setup; `find({ filters: { deleted: false } })` returns only the live one (branch 6, `whereNull`).
  6. `find` `deleted` absent — `find({ filters: {} })`; both live and soft-deleted docs appear (branches 5+6 falsy arms).
  7. `fromHousingDocumentDBO` throws on null creator — call `fromHousingDocumentDBO(<DBO with creator: null>)` directly; assert it throws `Error('Creator not fetched')` (branch 9 true arm). Pure, no DB.

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/housingDocumentRepository.test.ts -t "find|fromHousingDocumentDBO"`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings on the modified file.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover housingDocumentRepository find filters and creator guard"`

---

## Task 2: Verify coverage target reached

**Files:** none (measurement + DoD gate).

- [ ] **Step 1: Measure.**

```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=json-summary --coverage.include='src/repositories/housingDocumentRepository.ts' src/repositories/test/housingDocumentRepository.test.ts
```

Read `server/coverage/coverage-summary.json` for `housingDocumentRepository.ts` branch %. Expected **≥ 85%** (from 52.6%).

- [ ] **Step 2: If below 85%** — read remaining uncovered lines, add the missing case(s) by the same mirroring method (no production change), re-run. Commit as `test(server): close remaining housingDocumentRepository coverage gaps`.

- [ ] **Step 3: Confirm no regressions.** `yarn nx test server -- run src/repositories/test/housingDocumentRepository.test.ts` → all green.

---

## Definition of Done

- `housingDocumentRepository.ts` branch coverage ≥ 85%; all tests green; typecheck + lint clean.
- No production code changed; the possibly-dead `!dbo.creator` guard documented for Phase 3.
- **Review checkpoint** — stop for review before the next Phase-2 repo.
