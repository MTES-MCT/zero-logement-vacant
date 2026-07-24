# Kysely Migration — eventRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `eventRepository`'s 5 remaining Knex functions (`insertManyPrecisionHousingEvents`, `insertManyCampaignEvents`, `insertManyDocumentEvents`, `insertManyHousingDocumentEvents`, `find`) to Kysely — the last file in this migration effort. No new characterization tests needed: all 5 already had thorough dedicated coverage (part of the file's existing 73+ test blocks), unlike every other file in this effort.

**Architecture:**

1. **The 4 `insertMany*` functions** follow the exact `withinKyselyTransaction` + `pMap(Array.chunksOf(events, INSERT_BATCH_SIZE), ..., {concurrency: 1})` pattern already used by this file's other (already-migrated) `insertMany*` functions. Matched each new function to its closest already-migrated sibling for onConflict behavior: `insertManyPrecisionHousingEvents`/`insertManyCampaignEvents`/`insertManyDocumentEvents`/`insertManyHousingDocumentEvents` had no conflict handling in their original Knex `batchInsert` calls (a plain insert, not an upsert), matching `insertManyOwnerEvents`/`insertManyCampaignHousingEvents`/`insertManyGroupHousingEvents`'s no-`onConflict` Kysely pattern — not `insertManyHousingEvents`/`insertManyHousingOwnerEvents`'s `onConflict(...).doNothing()` pattern.
2. **`insertManyCampaignEvents` is migrated, not removed**, despite having zero production callers (confirmed dead, same as several other functions removed earlier in this effort) — unlike those, it has dedicated characterization tests (2 tests), suggesting deliberate intent to keep it working. No existing replacement supersedes it (unlike `ownerRepository.save`/`saveMany` → `betterSave`, or `campaignRepository.insert`/`update` → `save`).
3. **`find`'s `housings` filter** matches a composite `(housingGeoCode, housingId)` key across 6 UNIONed subqueries (`housingEvents`, `groupHousingEvents`, `precisionHousingEvents`, `housingOwnerEvents`, `campaignHousingEvents`, `housingDocumentEvents`). Kysely's tuple-IN support (`eb(eb.refTuple(col1, col2), 'in', pairs.map(v => eb.tuple(v1, v2)))`) — already used by `groupRepository.ts`'s `removeHousing` — handles the composite-key comparison; `.unionAll(...)` chains the 6 subqueries together, mirroring the original's `.unionAll(...)` chain exactly.
4. **`find`'s `creator` field** (`to_json(users.*)` via an inner join) stays snake_case regardless of engine (`CamelCasePlugin`'s `maintainNestedObjectKeys` leaves raw-SQL JSON aggregates untouched) — read via the existing `fromUserDBO` exactly as before. A new `parseEventRow` mirrors `parseEventApi` for the camelCase top-level columns; `parseEventApi`/`formatEventApi` (snake_case) stay unchanged since `formatEventApi` is heavily reused externally (6+ seed files, multiple controller/script tests) and `parseEventApi` has its own direct unit test.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`, `~/infra/database/kysely-transaction`), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the existing 79 tests in `eventRepository.test.ts` must pass UNCHANGED against the migrated code.
- **Do not change:** the `*_TABLE` constants, the `Events()`/`OwnerEvents()`/etc. Knex accessors, `EventRecordDBO`/`EventDBO`, `parseEventApi`, `formatEventApi`, and every other `format*EventApi` function — all still consumed externally by seeds, scripts, and other repositories' tests.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) full `eventRepository.test.ts` suite green; (4) every direct-caller controller test suite green (`owner-api`, `precisionController`, `group-api`, `campaign-api`, `housing-api`, `document-api`, `event-api`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely

**Files:**

- Modify: `server/src/repositories/eventRepository.ts`

- [x] **Step 1: Migrate the 4 `insertMany*` functions**, adding `toPrecisionHousingEventInsert`/`toCampaignEventInsert`/`toDocumentEventInsert`/`toHousingDocumentEventInsert` mirroring the existing `to*Insert` helpers' style.
- [x] **Step 2: Migrate `find`**, adding `matchesHousingTuple`/`housingEventIdsQuery` helpers and `parseEventRow`.
- [x] **Step 3: Migrate `removeCampaignEvents`'s Knex remnant** — already fully Kysely from a prior PR; confirmed unchanged.
- [x] **Step 4: Run the full existing test suite**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts`
Result: 79/79 pass on the first attempt, including the complex multi-way UNION tuple-IN `find` housings filter.

- [x] **Step 5: Run every direct caller's controller test suite**

Run: `yarn nx test server -- run src/controllers/test/owner-api.test.ts src/controllers/test/precisionController.test.ts src/controllers/test/group-api.test.ts src/controllers/test/campaign-api.test.ts src/controllers/test/housing-api.test.ts src/controllers/test/document-api.test.ts src/controllers/test/event-api.test.ts`
Result: 7 files, 233/233 pass.

- [x] **Step 6: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 7: Commit**

```bash
git add server/src/repositories/eventRepository.ts
git commit -m "feat(server): migrate eventRepository's remaining Knex functions to Kysely"
```

## Outcome

This completes the extended scope (the 5 files found in the final repo-wide sweep after the originally-scoped migration list finished): `establishmentLocalityRepository` (cleanup), `campaignRepository` (cleanup), `geoRepository`, `banAddressesRepository`, and `eventRepository`. Every repository's query-layer logic now runs on Kysely; Knex remains only for migrations/seeds, primitive test/seed table accessors, and the import-lovac ETL scripts (explicitly out of scope throughout this whole effort).
