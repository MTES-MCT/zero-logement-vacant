# Kysely Migration — Phase 2: geoRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Close the characterization gap for `geoRepository`'s live functions (`get`, `save`, `update`, `removeMany` — only `find` had a test) before migrating them to Kysely. `insert` is confirmed dead (zero callers anywhere) and is removed rather than characterized or migrated.

**Architecture:** Add tests to the existing `server/src/repositories/test/geoRepository.test.ts` (1 test existed).

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `geoRepository.ts` in this phase.
- **Found latent bug, documented not fixed:** unlike `find()`, `get()` never applies `st_asgeojson(geom)::jsonb` — its `geometry` field comes back as a raw PostGIS (EWKB hex) string, not a valid GeoJSON `MultiPolygon`, despite the declared `GeoPerimeterApi.geometry: MultiPolygon` type. Confirmed empirically against the real DB. `get()` is called live from `geoController.ts`, so this is a real, currently-shipping bug — flagged for the user, not fixed as part of this migration (fixing it would be a behavior change, out of scope for a preserve-behavior migration).
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Characterize get/save/update/removeMany; confirm insert is dead

- [x] **Step 1: `get`** — found (asserting the raw-string geometry bug as-is), not-found.
- [x] **Step 2: `save`** — insert-new, update-on-conflict (geom/name/kind).
- [x] **Step 3: `update`** — field update, excluding id/establishmentId/geometry (verified the geometry column is untouched even when a different one is passed).
- [x] **Step 4: `removeMany`** — removes matching (id, establishment) pairs; does not remove rows belonging to a different establishment.
- [x] **Step 5: Confirm `insert` is dead** — zero callers anywhere in the codebase (repo-wide grep); not characterized, removed in Phase 3.
- [x] **Step 6: Run and verify coverage**

Run: `yarn nx test server -- run src/repositories/test/geoRepository.test.ts --coverage --coverage.include='src/repositories/geoRepository.ts'`
Result: 88% statements (100% of the kept functions — the only gap is `insert`, which is removed in Phase 3), 8 tests.

- [x] **Step 7: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 8: Commit**

```bash
git add server/src/repositories/test/geoRepository.test.ts
git commit -m "test(server): characterize geoRepository get/save/update/removeMany"
```
