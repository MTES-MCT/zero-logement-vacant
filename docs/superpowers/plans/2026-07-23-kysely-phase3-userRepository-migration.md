# Kysely Migration — Phase 3: userRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `userRepository`'s remaining 10 Knex functions to Kysely — the last fully-Knex repository in the codebase — verified green against the Phase 2 characterization tests and every direct caller's test suite.

**Architecture:** Keep `USERS_TABLE`/`Users()` (Knex accessor), `UserDBO` (snake_case), and `fromUserDBO`/`toUserDBO` unchanged — both converters are imported and reused verbatim by many other repositories (`establishmentRepository`, `noteRepository`, `documentRepository`, `housingDocumentRepository`, `groupRepository`, `senderRepository`, `authIdentityService`, test factories, seeds) that are out of scope for this migration. Added new camelCase-native `parseUserRow`/`toUserInsert`/`toUserUpdate` for the Kysely path — since `UserDBO`'s fields already correspond 1:1 to `UserApi`'s camelCase fields (just different casing), these are near-identical duplicates of `fromUserDBO`/`toUserDBO` reading/writing camelCase Kysely rows directly, avoiding a wasteful round-trip through `Record.mapKeys` + the snake_case converters.

Notable translations:

1. **`find`'s establishments filter uses plain `DISTINCT`, not `DISTINCT ON`.** The original Knex `.distinct('users.id')` (called alongside `.select('users.*')`) is Knex's shorthand for "add this column to the select list and apply plain `SELECT DISTINCT`" — NOT Postgres's `DISTINCT ON`. Since only `users.*` columns are ever selected (never anything from the joined `usersEstablishments`), a plain `.distinct()` (no column argument) is the correct, exact Kysely equivalent — `DISTINCT ON` would additionally require the leading `ORDER BY` columns to match, which they don't here (`lastName`, `firstName`).
2. **The establishments+commitment join** translates the Knex `.join(table, function() { this.on(...).onIn(...).andOnVal(...) })` callback into Kysely's `.innerJoin(table, (join) => join.onRef(...).on(...).on(...))` — chained `.on()`/`.onRef()` calls are implicitly ANDed, matching the established pattern already used in `ownerRepository.ts`'s `applyOwnerFilters`.
3. **`count` only needs `count(DISTINCT users.id)`**, not the row-level plain-DISTINCT `find` needs — simpler, matches the original's `.countDistinct('users.id')` directly.
4. **`remove`'s multi-table transaction** (`session`, `account`, `authUsers`, `users`) now runs via `withinKyselyTransaction` instead of `db.transaction` — all four tables are reachable through the single shared `kysely` instance after the auth-v2 consolidation earlier in this migration effort, so this is a straightforward port with no bridging needed.
5. **Pagination default preserved**: `find()` without an explicit `pagination` option still defaults to `{ paginate: true, page: 1, perPage: 50 }`, capping unpaginated calls at 50 rows (same subtlety already documented in `ownerRepository.find()`).
6. **A `.$if()` narrowing gotcha**: `isPaginationEnabled(pagination)` passed as `.$if()`'s condition does not narrow `pagination`'s union type inside the separate callback closure (same class of issue hit in the `localityRepository` migration) — worked around by precomputing a plain `{ limit, offset } | null` object before the query chain, rather than trying to narrow the `PaginationApi` union inside the callback.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`, `~/infra/database/kysely-transaction`), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the 24 Phase 2 tests must pass UNCHANGED against the migrated code.
- **Do not change:** `USERS_TABLE`, `Users()`, `UserDBO`, `fromUserDBO`, `toUserDBO` — all still consumed externally by many other repositories, seeds, and test factories.
- **`update()` must never write `password`** — `toUserUpdate` strips it (and `id`) from `toUserInsert`'s output before the `.set(...)` call, preserving the original's `const { password: _legacyPassword, ...userRow } = toUserDBO(user)` guard.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) every direct-caller test suite green (`user-api`, `auth-controller`, `auth-integration`, `session` middleware, `auth-admin-two-factor`, `establishmentAuthService`, `auth-cutover-routing`, `protected-auth-api`, `resetLink-api`, `signupLink-api`, `prospect-api`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely

**Files:**

- Modify: `server/src/repositories/userRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `get`/`getByEmail`/`getByEmailIncludingDeleted`/`update`/`updateEstablishment`/`recordTwoFactorFailure`/`insert`/`find`/`count`/`remove`, plus `parseUserRow`/`toUserInsert`/`toUserUpdate`.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/userRepository.test.ts`
Result: 24/24 pass on the first attempt.

- [x] **Step 3: Run every direct caller's test suite**

Run: `yarn nx test server -- run src/controllers/test/user-api.test.ts src/controllers/test/auth-controller.test.ts src/controllers/test/auth-integration.test.ts src/middlewares/test/session.test.ts src/infra/test/auth-admin-two-factor.test.ts src/services/test/establishmentAuthService.test.ts src/routers/test/auth-cutover-routing.test.ts src/routers/test/protected-auth-api.test.ts src/controllers/test/resetLink-api.test.ts src/controllers/test/signupLink-api.test.ts src/controllers/test/prospect-api.test.ts`
Result: 11 files, 120 pass + 2 pre-existing todo.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors, after precomputing pagination params to work around the `.$if()` narrowing gotcha), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/userRepository.ts
git commit -m "feat(server): migrate userRepository to Kysely"
```

## Outcome

This closes out the Knex-to-Kysely repository migration effort: every repository's query-layer logic now runs on Kysely, with Knex retained only for (a) migrations/seeds (a deliberate, permanent split — see the original scoping conversation), (b) primitive test/seed table accessors (`Users()`, `Owners()`, etc. — intentionally out of scope, per `backend-conventions.md`), and (c) the import-lovac ETL scripts (explicitly excluded from this effort's scope).
