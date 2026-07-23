# Kysely Migration — Phase 2: authIdentityService Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a dedicated test file for `authIdentityService` from scratch (none existed) before its Kysely migration. Security-critical: manages `users`/`auth_users`/`account` (credentials) atomically.

**Architecture:** New file `server/src/services/test/authIdentityService.test.ts`. Only indirect coverage existed before (via `user-api.test.ts`). Exported `parseUserRow`/`toUserInsert`/`toUserUpdate` from the just-migrated `userRepository.ts` so this service's Kysely rewrite can reuse them instead of a third duplicate user-shape mapping.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), `bcryptjs`.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `authIdentityService.ts` in this phase.
- **`account.user_id` has a foreign key to `auth_users.id`** — any test inserting directly into `account` must first seed a matching `auth_users` row (a real FK violation surfaced this while writing the tests).
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Build the test file

**Files:**

- Create: `server/src/services/test/authIdentityService.test.ts`
- Modify: `server/src/repositories/userRepository.ts` (export `parseUserRow`/`toUserInsert`/`toUserUpdate`)

- [x] **Step 1: `insertUserWithAuthIdentity`** — atomically creates `users`/`auth_users`/`account` rows; name-derivation fallback to email when first/last name are both null.
- [x] **Step 2: `updateUserWithAuthIdentity`** — field update + auth identity sync; the password-field-is-dropped guard; credential upsert only when `credentialHash` is passed.
- [x] **Step 3: `updateCredentialPassword`** — create-if-missing and update-if-existing.
- [x] **Step 4: `verifyCredentialPassword`** — match, mismatch, no-account-found.
- [x] **Step 5: Run and verify coverage**

Run: `yarn nx test server -- run src/services/test/authIdentityService.test.ts --coverage --coverage.include='src/services/authIdentityService.ts'`
Result: 100% statements/branches/functions/lines (11 tests).

- [x] **Step 6: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 7: Commit**

```bash
git add server/src/services/test/authIdentityService.test.ts server/src/repositories/userRepository.ts
git commit -m "test(server): characterize authIdentityService from scratch"
```
