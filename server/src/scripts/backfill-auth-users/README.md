# backfill-auth-users

One-shot migration that copies every row from the domain `users` table into the
Better Auth `auth_users` table (and `account` for users that should still be
able to sign in).

## What it does

For every row in `users`:

1. Inserts a row into `auth_users` with the **same `id`** (the existing UUID is
   reused as `auth_users.id` and references `users.id`, so every existing FK
   that references `users.id` — `users_establishments.user_id`, `events.*`,
   `groups.created_by`, … — keeps working unchanged). `auth_users` contains
   only Better Auth's core identity fields; profile, role, activation and
   suspension remain owned by `users` and are joined when the session payload
   is built.
2. If the user is not deleted and has a password, inserts a credential row
   into `account` with the legacy bcrypt password hash. Suspended users keep a
   credential so they can sign in and see the suspension notice; soft-deleted
   users get an `auth_users` row but no `account` row.

Both inserts happen in a single per-row transaction and are idempotent: a
rerun keeps an existing `auth_users` row and creates a missing credential
account, but never overwrites the password of an existing credential account.

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

The GitHub deployment workflow does not directly run the migration or this
backfill. The current Clever Cloud API applications do run `server:migrate`
from their `CC_POST_BUILD_HOOK`, but they never run this backfill. Apply the
migration manually before the cutover anyway so the backfill can be completed
and checked before the new API starts. The deployment hook will then rerun the
idempotent migration against an already up-to-date database.

Complete and verify every database step below before deploying the new frontend
and API. Use the same commit for both applications and deploy them as close
together as possible: the legacy frontend is not compatible with the new API,
and the new frontend is not compatible with the legacy API.

Run the procedure on staging first, then repeat it on production and demo only
after the staging sign-in checks pass.

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

### 4. Inspect incompatible legacy rows

Run these read-only checks before the dry run:

```sql
SELECT lower(email) AS normalized_email, count(*), array_agg(id)
FROM users
GROUP BY lower(email)
HAVING count(*) > 1;

SELECT id, email, role
FROM users
WHERE deleted_at IS NULL
  AND establishment_id IS NULL;

SELECT id, email, role
FROM users
WHERE deleted_at IS NULL
  AND password IS NULL;
```

The email collision query must return no rows. Every active user without an
establishment or password must be understood before continuing: they cannot
create a normal authenticated session or credential account.

### 5. Preview the backfill

```bash
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts --dry-run
```

Review the summary before continuing. `errored` must be `0`; investigate every
unexpected skipped or unavailable account.

### 6. Freeze legacy authentication writes

After the dry run and immediately before the real backfill, stop the legacy API
or otherwise prevent user creation and password changes. A password changed in
`users` after the backfill would not be copied again because an existing Better
Auth credential is deliberately never overwritten.

Keep the legacy API stopped until the new API has been deployed. This creates a
short maintenance window but prevents credential divergence during the
cutover.

### 7. Run the backfill

```bash
NODE_OPTIONS='--import tsx/esm' \
  yarn workspace @zerologementvacant/server \
  node src/scripts/backfill-auth-users/index.ts
```

The command must exit successfully with `errored: 0`. It can be rerun after a
resolved partial failure, but it is not a continuous synchronization mechanism
and does not update an existing credential password.

### 8. Reconcile the migrated data

Run the following read-only checks against the target database:

```sql
SELECT
  (SELECT count(*) FROM users) AS domain_users,
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

### 9. Verify sign-in before the public cutover

Start a controlled instance of the new API commit against the target database;
do not use the public API while it still runs the legacy code. With a dedicated
existing test account, verify that `/auth/sign-in/email` accepts its legacy
password, returns a session cookie, and that `/auth/get-session` returns the
expected user and active establishment. Sign out afterwards. Do not proceed if
the account cannot sign in or its establishment/perimeter is incorrect.

For an administrator account, also verify receipt and validation of the 2FA
code through the controlled instance.

### 10. Deploy the cutover

Deploy the frontend and API from the same commit with the shortest practical
delay between them. Immediately repeat the sign-in and session checks through
the public frontend, then monitor authentication errors and HTTP `401`/`403`
responses.

Merging into `main` starts the staging frontend and API deployments in parallel
after CI. Pushing to `prod` starts the production and demo frontend/API
deployments in parallel, so the demo database and environment must also be
prepared before that push.

If the cutover fails, redeploy the previous frontend and API together. Keep the
new Better Auth tables in place during the emergency rollback. Existing users
retain their pre-cutover legacy password, but password changes made after the
cutover are stored only in `account`. Users created after the cutover also have
credentials only in `account`. Those users require the new API, and a rollback
can reactivate an older password for a pre-existing user.

## Password verification

Better-auth's default verifier is scrypt, but the legacy hashes are bcrypt
(`$2a$…`/`$2b$…`/`$2y$…`). `server/src/infra/auth-password.ts` provides a
verifier that detects the bcrypt prefix and uses `bcryptjs`, falling back to
scrypt for new signups; it is wired in at `server/src/infra/auth.ts` via
`emailAndPassword.password.verify`. On a successful bcrypt verify it
opportunistically rehashes to scrypt and updates `account.password`, so bcrypt
support is bounded in time — every active user moves to scrypt on their next
sign-in.
