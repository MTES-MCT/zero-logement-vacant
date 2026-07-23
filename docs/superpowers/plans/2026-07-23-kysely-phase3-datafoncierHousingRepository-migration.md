# Kysely Migration — Phase 3: datafoncierHousingRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `datafoncierHousingRepository`'s `find`/`findOne` from Knex to Kysely, verified green against the Phase 2 characterization tests.

**Architecture:** Keep `datafoncierHousingTable`/`DatafoncierHouses()` (Knex accessor) unchanged for test/seed backward compat. Replace `list()`, `find()`, `findOne()` with `kysely`. This table surfaced three gotchas worth reusing on any other Datafoncier table (`datafoncierOwnersRepository.ts`'s `df_owners_nat_2024` is the next migration target and will very likely hit the same first two):

1. **Table-name round-trip failure.** `CamelCasePlugin`'s runtime camelCase→snake_case reversal of `'dfHousingNat2024'` produces `df_housing_nat2024` (no underscore before the digit run) — NOT the real table `df_housing_nat_2024`. This is a fundamentally lossy transform for any identifier whose original snake_case had an underscore immediately before a digit sequence (the forward direction fuses `Nat` + `2024` with no marker to reverse from). Fix: `.selectFrom(sql\`df_housing_nat_2024\`.as('dfHousingNat2024') as unknown as 'dfHousingNat2024')` — a raw, correctly-spelled table reference at runtime, type-cast to the codegen'd key so column selects still resolve against the typed schema.
2. **CamelCasePlugin also camelCases result aliases.** A `sql\`...\`.as('ban_geom_json')`alias comes back in the result as`banGeomJson`, not `ban_geom_json`— alias in camelCase directly to avoid a silent`undefined` read.
3. **`DatafoncierHousing`'s ~130 fields are snake_case; Kysely's `selectAll()` output is camelCase.** Spreading a Kysely row directly into the return value silently mismatches every multi-word column (`banId` vs the expected `ban_id`, etc.) — a bug an assertion checking only 2-3 fields will not catch (see Phase 2 plan's constraint on full-object assertions). Fix: `Record.mapKeys(row, camelToSnake)` (from `effect`/`effect/String`, the same utility already used in `~/infra/database/index.ts`'s `where()` helper) to convert generically instead of hand-mapping every field.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), `effect`/`effect/String` (`Record.mapKeys`, `camelToSnake`), Knex (kept only for the `DatafoncierHouses()` test/seed accessor), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the Phase 2 tests (`server/src/repositories/test/datafoncierHousingRepository.test.ts`) must pass UNCHANGED against the migrated code, including the full-object `toEqual` assertion — that's what actually catches gotcha #3 above.
- **`ST_AsGeoJson`/`ST_Transform` raw SQL is unavoidable** — Kysely has no query-builder API for PostGIS functions; keep it as `sql\`...\``fragments, same as the original`db.raw(...)`.
- **`pg` auto-parses `::json`-cast columns into JS objects** — do not `JSON.parse()` the aliased geometry columns; they arrive already parsed (confirmed empirically and via `groupRepository.ts`/`campaignRepository.ts`'s existing `to_json(...)` precedent, which reads the result directly with no `JSON.parse`).
- **`idpropcte` stays inert** — see Phase 2 plan's note; do not wire it to a query.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) `datafoncierHousingController.test.ts` green (the one controller test exercising this repo).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate `find`/`findOne`/`list` to Kysely

**Files:**

- Modify: `server/src/repositories/datafoncierHousingRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `list()`/`find()`/`findOne()`/`parseDatafoncierHousingRow()`, applying the three gotchas above.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/datafoncierHousingRepository.test.ts`
Result: 5/5 pass, including the full-object `toEqual`.

- [x] **Step 3: Run the controller test**

Run: `yarn nx test server -- run src/controllers/datafoncierHousingController.test.ts`
Result: 3/3 pass.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/datafoncierHousingRepository.ts
git commit -m "feat(server): migrate datafoncierHousingRepository to Kysely"
```
