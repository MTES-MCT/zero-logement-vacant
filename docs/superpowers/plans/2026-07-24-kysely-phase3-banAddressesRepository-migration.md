# Kysely Migration — Phase 3: banAddressesRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 4 `banAddressesRepository` functions (`save`, `saveMany`, `getByRefId`, `remove`) to Kysely, verified against the Phase 2 characterization tests and every direct caller's test suite.

**Architecture:** `save`/`saveMany` become one `withinKyselyTransaction` upsert (`onConflict(['refId','addressKind']).doUpdateSet(...)`), matching the original's single bulk `.insert(...).onConflict([...]).merge([...])` — `save(address)` still just calls `saveMany([address])`. `getByRefId`/`remove` become direct `kysely.selectFrom`/`deleteFrom` calls.

**`parseAddressApi`/`formatAddressApi` (snake_case) stay exactly as they were** — `ownerRepository.ts` reuses `parseAddressApi` on a `to_json(ban.*)` raw-SQL blob it joins in, which stays snake_case regardless of query engine (`CamelCasePlugin`'s `maintainNestedObjectKeys: true` leaves raw-SQL JSON aggregates untouched). A new `parseAddressRow`/`toAddressInsert` pair handles the Kysely-native camelCase path for `getByRefId`/`save`/`saveMany` directly.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`, `~/infra/database/kysely-transaction`), Vitest (real Postgres integration tests, including a 2,000-row bulk-upsert test).

## Global Constraints

- **Verification, not characterization, this phase:** the 8 Phase 2 tests must pass UNCHANGED against the migrated code, including the 2,000-row `saveMany` bulk test.
- **Do not change:** `banAddressesTable`, `Addresses()`, `AddressDBO`, `parseAddressApi`, `formatAddressApi` — all still consumed externally (test/seed accessor pattern; `parseAddressApi` specifically reused by `ownerRepository.ts`).
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) every direct-caller test suite green (`owner-api`, `housing-api`, `housingExport-api`, `ownerDistanceService`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely

**Files:**

- Modify: `server/src/repositories/banAddressesRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `save`/`saveMany`/`getByRefId`/`remove`, adding `parseAddressRow`/`toAddressInsert` for the camelCase path.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/banAddressesRepository.test.ts`
Result: 8/8 pass on the first attempt, including the 2,000-row bulk upsert.

- [x] **Step 3: Run every direct caller's test suite**

Run: `yarn nx test server -- run src/controllers/test/owner-api.test.ts src/controllers/test/housing-api.test.ts src/controllers/test/housingExport-api.test.ts src/services/test/ownerDistanceService.test.ts`
Result: 4 files, 141/141 pass.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/banAddressesRepository.ts
git commit -m "feat(server): migrate banAddressesRepository to Kysely"
```
