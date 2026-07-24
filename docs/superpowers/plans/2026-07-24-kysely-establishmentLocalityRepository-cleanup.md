# Kysely Migration — establishmentLocalityRepository Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove `updateLocalities`, the only function in `establishmentLocalityRepository.ts` and the only remaining Knex query in this file — confirmed dead and vestigial, not migrated.

**Architecture:** `updateLocalities` writes to `establishments_localities`, a junction table nothing else in the codebase reads from (grep confirms only migrations, seeds, and one test fixture insert reference it — no `SELECT`/`.select()` anywhere). It's been superseded by `establishments.localities_geo_code` (an array column), which is what `establishmentRepository`'s and `localityRepository`'s Kysely-migrated filters actually operate on. `updateLocalities` itself has zero production callers and zero test coverage. Same category as the `hasAddress`/`hasName` (datafoncierOwnersRepository) and `save`/`saveMany` (ownerRepository) removals earlier in this effort: confirmed-dead, no clear ongoing purpose, migrating it to Kysely would be pure waste.

**Kept unchanged:** `establishmentsLocalitiesTable` constant, `EstablishmentLocalities()` Knex accessor, `EstablishmentLocalityDBO` type — all three are still imported by seeds and `locality-api.test.ts` for fixture setup.

## Global Constraints

- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) `locality-api.test.ts` (the one test file that seeds this table) green.
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Remove updateLocalities

**Files:**

- Modify: `server/src/repositories/establishmentLocalityRepository.ts`

- [x] **Step 1: Remove `updateLocalities` and the default export** — nothing imports the default export (verified via repo-wide grep); keep the three named exports.
- [x] **Step 2: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings), `yarn nx test server -- run src/controllers/test/locality-api.test.ts` (18/18 pass).
- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/establishmentLocalityRepository.ts
git commit -m "feat(server): remove dead updateLocalities from establishmentLocalityRepository"
```
