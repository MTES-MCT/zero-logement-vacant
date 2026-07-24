# Kysely Migration — Phase 2: establishmentRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Raise `establishmentRepository`'s branch coverage from 79.31% (23/29) to 100% with characterization tests, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/establishmentRepository.test.ts` (24 tests already existed). Gaps: the `query` filter (raw `likeUnaccent` search), the `kind` filter, the `name` filter (regex-normalized name match), `stream()` (entirely — zero callers anywhere, production or test, unlike `find`/`get`/`update`), and `findOne`'s no-siren branch.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `establishmentRepository.ts` in this phase.
- **`stream()` is dead code found along the way** — zero callers anywhere (unlike the structurally-similar `housingRepository.stream`/`ownerRepository.stream`, which ARE used for CSV export in `housingExportController.ts`). Kept (not deleted, unlike `hasAddress`/`hasName` in `datafoncierOwnersRepository`) since it mirrors an actively-used sibling pattern and was plausibly added for a not-yet-wired-up establishment export feature — migrate it in Phase 3 rather than remove it, but flag it.
- **`query` vs `name` filters are two distinct, both-reachable paths** (both are fields on `EstablishmentFiltersDTO`, and `establishmentController.ts` passes the entire incoming HTTP query object as filters directly — so both are reachable via the API even without an in-repo caller naming them explicitly). `name` expects an ALREADY-NORMALIZED value (apostrophes/parenthetical-suffix stripped, spaces/hyphens collapsed to a single hyphen, lowercased, unaccented) matched via a trailing `LIKE`; `query` is a simpler accent/case-insensitive substring match via the existing `likeUnaccent` helper.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Close the filter/stream/findOne coverage gaps

**Files:**

- Modify: `server/src/repositories/test/establishmentRepository.test.ts`

- [x] **Step 1: `kind` filter test**
- [x] **Step 2: `query` filter tests** — matching (accent/case-insensitive) and non-matching.
- [x] **Step 3: `name` filter tests** — matching (pre-normalized value) and non-matching.
- [x] **Step 4: `stream()` tests** — full stream via `ReadableStream.getReader()`, and the `updatedAfter` cutoff filter excluding an older row.
- [x] **Step 5: `findOne({})` (no siren) test** — closes the last branch.
- [x] **Step 6: Run and verify 100% coverage**

Run: `yarn nx test server -- run src/repositories/test/establishmentRepository.test.ts --coverage --coverage.include='src/repositories/establishmentRepository.ts'`
Result: 100% statements/branches/functions/lines (32 tests).

- [x] **Step 7: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 8: Commit**

```bash
git add server/src/repositories/test/establishmentRepository.test.ts
git commit -m "test(server): characterize establishmentRepository query/kind/name filters and stream"
```
