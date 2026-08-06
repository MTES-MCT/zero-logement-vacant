#!/usr/bin/env sh
# Regenerate the Kysely DB types (server/src/infra/database/db.d.ts) when a
# merge or rebase brings in migration changes.
#
# This is a best-effort local convenience: it NEVER blocks the git operation.
# The authoritative guarantee is the CI drift-check in
# .github/workflows/pull-request.yml — this hook just spares you the round-trip.

MIGRATIONS_PATH="server/src/infra/database/migrations"
TYPES_FILE="server/src/infra/database/db.d.ts"

# git sets ORIG_HEAD for both merge and rebase; without it we can't tell what
# changed, so do nothing.
if ! git rev-parse --verify --quiet ORIG_HEAD >/dev/null 2>&1; then
  exit 0
fi

# Only regenerate when migrations actually changed.
if git diff --quiet ORIG_HEAD HEAD -- "$MIGRATIONS_PATH"; then
  exit 0
fi

echo "▸ Migrations changed — regenerating Kysely types (server)…"

# --skip-nx-cache: force a real migrate + introspect so a cached db.d.ts can't
# mask drift. Needs a reachable dev database; if it's down we warn and move on.
if ! yarn nx codegen server --skip-nx-cache >/dev/null 2>&1; then
  printf '⚠ Could not regenerate Kysely types (is the dev database running?).\n  Run: yarn nx codegen server\n' >&2
  exit 0
fi

if git diff --quiet -- "$TYPES_FILE"; then
  echo "▸ Kysely types already up to date."
else
  printf '⚠ Kysely types updated in %s — review and commit the change.\n' "$TYPES_FILE" >&2
fi
