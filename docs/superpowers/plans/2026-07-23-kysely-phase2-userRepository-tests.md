# Kysely Migration — Phase 2: userRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a dedicated repository test file for `userRepository` from scratch (none existed) before its Kysely migration.

**Architecture:** New file `server/src/repositories/test/userRepository.test.ts`. Baseline indirect coverage via `user-api.test.ts`/`auth-controller.test.ts`/`auth-integration.test.ts`/`session.test.ts` was already 80.95% statements — this phase adds direct, dedicated tests for all 10 functions (`get`, `getByEmail`, `getByEmailIncludingDeleted`, `update`, `updateEstablishment`, `recordTwoFactorFailure`, `insert`, `find`, `count`, `remove`) plus the pure `fromUserDBO`/`toUserDBO` converters, matching this codebase's one-dedicated-test-file-per-repository convention.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `userRepository.ts` in this phase.
- **`find`'s establishments filter uses `has_commitment`** (via `users_establishments`/`UsersEstablishments()`) and a `DISTINCT` on `users.id` to avoid duplicate rows when a user has commitments to more than one filtered establishment — both need direct coverage since it's easy to regress the distinct during a Kysely rewrite.
- **`update` silently drops the incoming `password` field** (`const { password: _legacyPassword, ...userRow } = toUserDBO(user); await Users().where(...).update(userRow);`) — characterized explicitly since it's a subtle, easy-to-lose behavior (auth-v2 owns `account.password`; this legacy field must never round-trip back into `users.password` via a generic update).
- **`recordTwoFactorFailure`'s lock is sticky once set** (`COALESCE(two_factor_locked_until, ?)` — a second failure past the threshold does not push the lock further out) — characterized explicitly.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Build the test file

**Files:**

- Create: `server/src/repositories/test/userRepository.test.ts`

- [x] **Step 1: `get`/`getByEmail`/`getByEmailIncludingDeleted`** — found, not-found, and soft-delete exclusion (the `IncludingDeleted` variant finds a deleted user; the other two don't).
- [x] **Step 2: `update`** — field update, and the password-field-is-dropped guard.
- [x] **Step 3: `updateEstablishment`, `recordTwoFactorFailure`** (increment, lock-on-threshold, lock-is-sticky), `insert` (happy path + a full optional-field round-trip to close the `fromUserDBO`/`toUserDBO` ternary branches).
- [x] **Step 4: `find`** — default pagination-to-50, establishments+commitment filter, distinct-across-multiple-commitments, explicit pagination, pagination disabled.
- [x] **Step 5: `count`** — mirrors `find`'s filters.
- [x] **Step 6: `remove`** — soft-delete.
- [x] **Step 7: Run and verify coverage**

Run: `yarn nx test server -- run src/repositories/test/userRepository.test.ts --coverage --coverage.include='src/repositories/userRepository.ts'`
Result: 100% statements/functions/lines, 97.29% branches (24 tests) — the one remaining branch is `toUserDBO`'s `lastAuthenticatedAt` falsy path (a user inserted having never authenticated), a low-value edge case in a pure converter; not chased further.

- [x] **Step 8: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 9: Commit**

```bash
git add server/src/repositories/test/userRepository.test.ts
git commit -m "test(server): characterize userRepository from scratch"
```
