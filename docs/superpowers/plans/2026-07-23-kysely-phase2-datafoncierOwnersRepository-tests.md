# Kysely Migration — Phase 2: datafoncierOwnersRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add characterization tests for `datafoncierOwnersRepository` from scratch (no test file existed) before its Kysely migration.

**Architecture:** New file `server/src/repositories/test/datafoncierOwnersRepository.test.ts`. `findDatafoncierOwners()` is the only method called in production (`housingController.ts:288`); `count()` is unused anywhere in production code, but is still public API worth characterizing. `hasAddress()`/`hasName()` (exported standalone functions) have **zero references anywhere in the codebase, including tests** — confirmed dead code, flagged for removal in Phase 3 rather than migrated.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `@zerologementvacant/models/fixtures` generators (`genDatafoncierOwners`, `genIdprocpte`).

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `datafoncierOwnersRepository.ts` in this phase.
- **Full-object assertions matter here too** — same lesson as `datafoncierHousingRepository`: assert `toEqual` against a full fixture object for at least one row, not just the handful of fields (`idprocpte`, `idpersonne`, `dnulp`, `ccogrm`) each test explicitly exercises.
- **Fixture note:** `genDatafoncierOwner`/`genDatafoncierOwners` randomize `idpersonne` per call — to test `count()`'s DISTINCT-by-idpersonne behavior or `findDatafoncierOwners`' JS-side dedup, manually override `idpersonne` on the generated object before inserting (`{ ...owner, idpersonne: first.idpersonne }`), rather than relying on the fixture to produce collisions.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Characterize `findDatafoncierOwners` and `count`

**Files:**

- Create: `server/src/repositories/test/datafoncierOwnersRepository.test.ts`

- [x] **Step 1: `findDatafoncierOwners` tests** — idprocpte filter match, no-match empty array, no-filter-returns-all, dnulp ordering, idpersonne dedup, full-object equality on one row.
- [x] **Step 2: `count` tests** — ccogrm null-or-in-[0,7,8] filter, distinct-by-idpersonne across duplicate rows.
- [x] **Step 3: Run and verify coverage**

Run: `yarn nx test server -- run src/repositories/test/datafoncierOwnersRepository.test.ts --coverage --coverage.include='src/repositories/datafoncierOwnersRepository.ts'`
Result: 75%/80%/60%/73% (7 tests) — the only gaps are `hasAddress`/`hasName`, confirmed dead code, not characterized (see Architecture note; removed in Phase 3 instead).

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/test/datafoncierOwnersRepository.test.ts
git commit -m "test(server): characterize datafoncierOwnersRepository findDatafoncierOwners and count"
```
