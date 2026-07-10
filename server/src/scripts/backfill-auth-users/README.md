# backfill-auth-users

One-shot migration that copies every row from the legacy `users` table into the
better-auth `auth_users` table (and `account` for users that should still be
able to sign in).

## What it does

For every row in `users`:

1. Inserts a row into `auth_users` with the **same `id`** (the legacy UUID is
   reused as `auth_users.id`, so every existing FK that references
   `users.id` — `users_establishments.user_id`, `events.*`, `groups.created_by`,
   … — keeps working unchanged).
2. If the user is not deleted and has a password, inserts a credential row
   into `account` with the legacy bcrypt password hash. Suspended users keep a
   credential so they can sign in and see the suspension notice; soft-deleted
   users get an `auth_users` row but no `account` row.

Both inserts happen in a single per-row transaction and are idempotent: a
rerun skips users that already have an `auth_users` row.

## Usage

```bash
# Dry run (rolls back every row's transaction; logs counts as if applied)
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts --dry-run

# Real run
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts
```

The script logs a final summary:

```
{ inserted, skippedExisting, accountInserted, accountSkippedExisting, accountSkippedUnavailable, errored }
```

## Staging cutover

The staging API deployment runs the database migrations and this idempotent
backfill in its Clever Cloud pre-run hook. The frontend deployment waits for
the API deployment to succeed, so a migration or backfill error prevents the
new frontend from being exposed. Subsequent runs should report existing rows
as skipped.

## Password verification

Better-auth's default verifier is scrypt, but the legacy hashes are bcrypt
(`$2a$…`/`$2b$…`/`$2y$…`). `server/src/infra/auth-password.ts` provides a
verifier that detects the bcrypt prefix and uses `bcryptjs`, falling back to
scrypt for new signups; it is wired in at `server/src/infra/auth.ts` via
`emailAndPassword.password.verify`. On a successful bcrypt verify it
opportunistically rehashes to scrypt and updates `account.password`, so bcrypt
support is bounded in time — every active user moves to scrypt on their next
sign-in.
