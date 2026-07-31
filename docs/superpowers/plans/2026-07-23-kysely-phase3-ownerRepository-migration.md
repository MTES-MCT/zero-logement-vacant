# Kysely Migration — Phase 3: ownerRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish migrating `ownerRepository`'s remaining Knex functions to Kysely, fixing the known SQL injection in `updateAddressList` along the way — except `updateAddressList` turned out to be unfixable-as-is and was removed instead (see below), and `save`/`saveMany` were removed as confirmed-dead deprecated code rather than migrated.

**Architecture:** `find`/`count`/`get`/`stream`/`findOne`/`searchOwners`/`findByHousing`/`betterSave`/`betterSaveMany`/`refreshMultiOwnerFlags` were already Kysely-migrated (prior PR). This phase covers the remaining 8: `insert`, `save`, `saveMany`, `update`, `insertHousingOwners`, `deleteHousingOwners`, `updateAddressList`, `escapeValue`. Confirmed via exhaustive `grep` across the whole codebase that **none of the 8 have any production caller** — only test files call them.

**Three different dispositions, not one uniform migration:**

1. **Migrated as-is:** `insert`, `update`, `insertHousingOwners`, `deleteHousingOwners`. Not deprecated, have existing dedicated test coverage (someone characterized them deliberately), straightforward 1:1 Kysely translations.
2. **Removed — deprecated, superseded, untested:** `save`/`saveMany`. Both explicitly `@deprecated Use betterSave instead`; `betterSave`/`betterSaveMany` (already Kysely, already used by every real caller) cover the same use case; zero test coverage existed for either.
3. **Removed — the SQL-injection fix that couldn't be a fix:** `updateAddressList`/`escapeValue`. Writing a characterization test for this function (which had zero test coverage) surfaced that it targets `owners.postal_code`/`house_number`/`street`/`city` — columns that **no longer exist in the schema**, confirmed by an actual Postgres `column "postal_code" of relation "owners" does not exist` error when the test ran against the current code. The function has been fully superseded by the `ban_addresses`-linked `banAddress` field (populated via `betterSave`/`get`/`find`'s `banAddress` include) and cannot be "fixed" to work — parameterizing the SQL would produce secure code that still 500s on every call. Confirmed with the user before removing (this is a bigger, more consequential call than a orphaned helper function, and directly touches the security fix that was explicitly requested).

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), Vitest (real Postgres integration tests).

## Global Constraints

- **`ownerTable`/`Owners()`/`OwnerRecordDBO`/`OwnerDBO`/`formatOwnerApi`/`parseOwnerApi` stay unchanged** — still consumed by the Knex accessor pattern in tests/seeds/scripts (`formatOwnerApi` in particular is heavily used externally even though no longer called from within the repository file itself after `saveMany`'s removal).
- **`startDate`/`endDate` on `ownersHousing` are `ColumnType<string, string, string>`** in the Kysely-generated type (DATE columns, global custom type parser) — passing a JS `Date` for insert needs an `as unknown as string` cast; the `pg` driver serializes it correctly on write regardless of Kysely's stricter typing.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) full `ownerRepository.test.ts` suite green; (4) every direct-caller controller test suite green (`owner-api`, `housing-api`, `housing-owner-api`, `event-api`, `housingExport-api`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Add characterization tests, discover the updateAddressList issue, confirm scope with the user

- [x] **Step 1: Add `updateAddressList` characterization tests** (zero existing coverage) — happy path, empty array, empty addressId skip, single-quote/injection-attempt payload, multi-row batch.
- [x] **Step 2: Run them against the current code** — 3 of 5 failed with `column "postal_code" of relation "owners" does not exist`; the injection-payload test failed with a syntax error (parse-time, before semantic analysis) rather than demonstrating a clean injection, but the dominant finding is the missing columns, not the payload shape.
- [x] **Step 3: Confirm the removal decision with the user** given it contradicts the literal "fix it" framing from the original ask — user confirmed: remove `updateAddressList`/`escapeValue` entirely.

### Task 2: Migrate insert/update/insertHousingOwners/deleteHousingOwners; remove save/saveMany/updateAddressList/escapeValue

**Files:**

- Modify: `server/src/repositories/ownerRepository.ts`
- Modify: `server/src/repositories/test/ownerRepository.test.ts` (remove the now-moot `updateAddressList` describe block added in Task 1's Step 1)

- [x] **Step 1: Migrate `insert`** to `kysely.insertInto('owners').values({...}).returningAll().executeTakeFirstOrThrow()`, parsed via the existing `parseOwnerRow`.
- [x] **Step 2: Migrate `update`** the same way with `updateTable('owners').set({...}).where('id', '=', ...)`.
- [x] **Step 3: Migrate `insertHousingOwners`** to `kysely.insertInto('ownersHousing').values(...).returningAll().execute()`, returning `rows.length`.
- [x] **Step 4: Migrate `deleteHousingOwners`** to `kysely.deleteFrom('ownersHousing').where(...).executeTakeFirst()`, returning `Number(result.numDeletedRows)`.
- [x] **Step 5: Remove `save`, `saveMany`, `SaveOptions`, `updateAddressList`, `escapeValue`** and their entry in the default export object.
- [x] **Step 6: Remove the now-unused `AddressApi` import** (was only used by `updateAddressList`'s parameter type).
- [x] **Step 7: Remove the `updateAddressList` describe block** from the test file (5 tests added in Task 1), and the now-unused `genAddressApi`/`AddressKinds` test imports.
- [x] **Step 8: Run the full repository test suite**

Run: `yarn nx test server -- run src/repositories/test/ownerRepository.test.ts`
Result: 39/39 pass.

- [x] **Step 9: Run every direct caller's controller test suite**

Run: `yarn nx test server -- run src/controllers/test/owner-api.test.ts src/controllers/test/housing-api.test.ts src/controllers/test/housing-owner-api.test.ts src/controllers/test/event-api.test.ts src/controllers/test/housingExport-api.test.ts`
Result: 5 files, 112 tests pass.

- [x] **Step 10: Mandatory gates** — `yarn nx typecheck server` (0 errors, after casting `startDate`/`endDate` and removing the unused `AddressApi` import), `yarn lint` (0 warnings).
- [ ] **Step 11: Commit**

```bash
git add server/src/repositories/ownerRepository.ts server/src/repositories/test/ownerRepository.test.ts
git commit -m "feat(server): migrate ownerRepository CRUD tail to Kysely, remove dead code"
```
