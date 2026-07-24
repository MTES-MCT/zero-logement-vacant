# Kysely Migration — Phase 3: geoRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `geoRepository`'s `find`/`get`/`save`/`update`/`removeMany` to Kysely, verified against the Phase 2 characterization tests and `geo-api.test.ts`. Removes `insert` (confirmed dead).

**Architecture:** `geom` is a real PostGIS `geometry(MultiPolygon,4326)` column. Empirically confirmed (via direct `psql`) that PostGIS accepts an implicit cast from GeoJSON text to `geometry` — so `save()` can insert `JSON.stringify(perimeter.geometry)` directly, matching what the original Knex path did implicitly (the `pg` driver auto-`JSON.stringify`s a plain object bind parameter).

**The `get()` bug is preserved on purpose.** `find()` selects an extra `st_asgeojson(geom)::jsonb` computed column (aliased `geomJson`); `get()` does not. A single `parseGeoPerimeterRow` reads `row.geomJson ?? row.geom` — when `find()` provides `geomJson` (proper GeoJSON, auto-parsed from `jsonb` by the `pg` driver, no `JSON.parse` needed), that wins; when `get()` doesn't select it, the raw `geom` string falls through, reproducing the exact pre-migration bug in one shared parser rather than forking two.

**`update()` excludes `id`/`establishmentId`/`geometry`** from the `.set()` call, matching the original's destructure-and-drop of `id`/`establishment_id`/`geom` — confirmed by a characterization test that a different `geometry` passed to `update()` does not change the stored geometry.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the 8 Phase 2 tests must pass UNCHANGED against the migrated code, including the `get()` bug-preservation assertion.
- **`insert` removed, not migrated** — zero production callers, no test coverage (confirmed in Phase 2).
- **`parseGeoPerimeterApi` (the legacy snake_case DBO parser) also removed** — confirmed zero external callers (only `formatGeoPerimeterApi` is still used, by the test file's fixture-insert pattern via `GeoPerimeters()`).
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) `geo-api.test.ts` green.
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely, remove insert

**Files:**

- Modify: `server/src/repositories/geoRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `find`/`get`/`save`/`update`/`removeMany`/`parseGeoPerimeterRow`, removing `insert` and `parseGeoPerimeterApi`.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/geoRepository.test.ts`
Result: 8/8 pass on the first attempt.

- [x] **Step 3: Run the controller test suite**

Run: `yarn nx test server -- run src/controllers/test/geo-api.test.ts`
Result: 19/19 pass (+ 2 pre-existing skips).

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/geoRepository.ts
git commit -m "feat(server): migrate geoRepository to Kysely"
```
