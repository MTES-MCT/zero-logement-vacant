# Kysely Migration — Phase 3: authIdentityService Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `authIdentityService`'s 4 exported functions (`insertUserWithAuthIdentity`, `updateUserWithAuthIdentity`, `updateCredentialPassword`, `verifyCredentialPassword`) from Knex to Kysely, verified green against the Phase 2 characterization tests and every direct caller's test suite. This completes the original migration scope (it had been missed in the first sweep — see the conversation's status-correction point).

**Architecture:** The whole file runs multi-table writes (`users`/`authUsers`/`account`) that must commit atomically. Reuses `parseUserRow`/`toUserInsert`/`toUserUpdate` (exported from `userRepository.ts` for this purpose in Phase 2) rather than a third duplicate user-shape mapping. `withinKyselyTransaction` replaces `db.transaction`, passing the same `trx: Transaction<DB>` through `syncAuthIdentity`/`upsertCredentialAccount` exactly as the original passed a Knex `transaction` object through.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`, `~/infra/database/kysely-transaction`), Vitest (real Postgres integration tests).

## Global Constraints

- **Verification, not characterization, this phase:** the 11 Phase 2 tests must pass UNCHANGED against the migrated code.
- **`account.userId` has an FK to `authUsers.id`** — `syncAuthIdentity` must run before `upsertCredentialAccount` within the same transaction on `insertUserWithAuthIdentity`'s path (matches the original's ordering).
- **`onConflict` upsert for `authUsers`** uses `.column('id').doUpdateSet({...})` with literal values (not `eb.ref('excluded.x')`) since the merge set is a small, fixed, pre-known field list — simpler than `ownerRepository.ts`'s dynamic `kyselyOwnerConflict` helper, which exists to support a caller-supplied column list this function doesn't need.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors (note: nx's typecheck cache went stale mid-session and needed `--skip-nx-cache` once to get an accurate read — re-run if a fresh edit doesn't seem to be reflected); (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) `user-api`, `auth-controller`, `auth-integration`, `auth-admin-two-factor` test suites green.
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely

**Files:**

- Modify: `server/src/services/authIdentityService.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `syncAuthIdentity`/`upsertCredentialAccount`/`insertUserWithAuthIdentity`/`updateUserWithAuthIdentity`/`updateCredentialPassword`/`verifyCredentialPassword`.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/services/test/authIdentityService.test.ts`
Result: 11/11 pass on the first attempt.

- [x] **Step 3: Run every direct caller's test suite**

Run: `yarn nx test server -- run src/controllers/test/user-api.test.ts src/controllers/test/auth-controller.test.ts src/controllers/test/auth-integration.test.ts src/infra/test/auth-admin-two-factor.test.ts`
Result: 4 files, 65 pass + 2 pre-existing todo.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors, after working around a stale nx typecheck cache with `--skip-nx-cache`), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/services/authIdentityService.ts
git commit -m "feat(server): migrate authIdentityService to Kysely"
```

## Outcome

This completes the originally-scoped migration list (localityRepository, datafoncierHousingRepository, datafoncierOwnersRepository, establishmentRepository, ownerRepository's tail, userRepository, authIdentityService). Separately, a final repo-wide sweep surfaced 5 more files with partial Knex remnants outside the original scope (`banAddressesRepository`, `campaignRepository`, `eventRepository`, `geoRepository`, `establishmentLocalityRepository`) — the user has asked to include those in this effort too; they're tracked as follow-on work, not yet started as of this doc.
