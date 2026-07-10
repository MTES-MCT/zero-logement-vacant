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

## Manual cutover runbook

Migrations and this backfill are deliberately **not** run by the deployment
workflows. Complete and verify every database step below before deploying the
new frontend and API. Use the same commit for both applications and deploy them
as close together as possible: the legacy frontend is not compatible with the
new API, and the new frontend is not compatible with the legacy API.

Run the procedure on staging first, then repeat it on production only after the
staging sign-in checks pass.

### 1. Back up the target database

Create a manual Clever Cloud PostgreSQL backup or snapshot and record its ID
and creation time. Do not continue until the backup is complete and its restore
procedure has been checked.

### 2. Select the target database explicitly

From the repository root, export the target add-on URI for the current shell.
Double-check the hostname and database name before running any command:

```bash
export DATABASE_URL='<TARGET_POSTGRESQL_ADDON_URI>'
```

### 3. Apply the additive Better Auth migration

```bash
yarn workspace @zerologementvacant/server migrate
```

### 4. Preview the backfill

```bash
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts --dry-run
```

Review the summary before continuing. `errored` must be `0`; investigate every
unexpected skipped or unavailable account.

### 5. Run the backfill

```bash
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts
```

The command must exit successfully with `errored: 0`. It is idempotent and can
be rerun after a resolved operational failure.

### 6. Reconcile the migrated data

Run the following read-only checks against the target database:

```sql
SELECT
  (SELECT count(*) FROM users) AS legacy_users,
  (SELECT count(*) FROM auth_users) AS auth_users;

SELECT count(*) AS missing_auth_users
FROM users AS u
LEFT JOIN auth_users AS au ON au.id = u.id
WHERE au.id IS NULL;

SELECT count(*) AS missing_credentials
FROM users AS u
LEFT JOIN account AS a
  ON a.user_id = u.id
 AND a.provider_id = 'credential'
WHERE u.deleted_at IS NULL
  AND u.password IS NOT NULL
  AND a.id IS NULL;
```

The user counts must match, and both `missing_auth_users` and
`missing_credentials` must be `0`.

### 7. Verify sign-in before the public cutover

Start a controlled instance of the new API commit against the target database;
do not use the public API while it still runs the legacy code. With a dedicated
existing test account, verify that `/auth/sign-in/email` accepts its legacy
password, returns a session cookie, and that `/auth/get-session` returns the
expected user and active establishment. Sign out afterwards. Do not proceed if
the account cannot sign in or its establishment/perimeter is incorrect.

For an administrator account, also verify receipt and validation of the 2FA
code through the controlled instance.

### 8. Deploy the cutover

Deploy the frontend and API from the same commit with the shortest practical
delay between them. Immediately repeat the sign-in and session checks through
the public frontend, then monitor authentication errors and HTTP `401`/`403`
responses.

If the cutover fails, redeploy the previous frontend and API together. Keep the
new Better Auth tables in place during the emergency rollback; the migration is
additive and the legacy application ignores them.

## Password verification

Better-auth's default verifier is scrypt, but the legacy hashes are bcrypt
(`$2a$…`/`$2b$…`/`$2y$…`). `server/src/infra/auth-password.ts` provides a
verifier that detects the bcrypt prefix and uses `bcryptjs`, falling back to
scrypt for new signups; it is wired in at `server/src/infra/auth.ts` via
`emailAndPassword.password.verify`. On a successful bcrypt verify it
opportunistically rehashes to scrypt and updates `account.password`, so bcrypt
support is bounded in time — every active user moves to scrypt on their next
sign-in.
