#!/usr/bin/env bash
# Creates branch-specific dev and test databases for a worktree, then patches
# the DATABASE_URL in server/.env and server/.env.test to point to them.
#
# Usage (called by wt post-start hook):
#   bash scripts/wt-setup-dbs.sh <branch_db_suffix>
#
# The <branch_db_suffix> should come from wt's `{{ branch | sanitize_db }}`
# template variable, which produces a lowercase, underscore-safe name with a
# short hash suffix to avoid collisions (e.g. feat_my_feature_x7k).
#
# Prerequisites: Docker container named `zlv` must be running (see .docker/).

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <branch_db_suffix>" >&2
  exit 1
fi

SUFFIX="$1"
DEV_DB="dev_${SUFFIX}"
TEST_DB="test_${SUFFIX}"

# Create databases (idempotent — ignore error if already exists)
docker exec zlv createdb -U postgres "$DEV_DB" 2>/dev/null \
  && echo "Created database: $DEV_DB" \
  || echo "Database already exists: $DEV_DB"

docker exec zlv createdb -U postgres "$TEST_DB" 2>/dev/null \
  && echo "Created database: $TEST_DB" \
  || echo "Database already exists: $TEST_DB"

# Patch server/.env — replace DATABASE_URL with branch-specific dev DB
sed -i '' \
  "s|DATABASE_URL=postgres://[^@]*@localhost/[^ ]*|DATABASE_URL=postgres://postgres:postgres@localhost/${DEV_DB}|" \
  server/.env

# Patch server/.env.test — replace DATABASE_URL with branch-specific test DB
sed -i '' \
  "s|DATABASE_URL=postgres://[^@]*@localhost/[^ ]*|DATABASE_URL=postgres://postgres:postgres@localhost/${TEST_DB}|" \
  server/.env.test

echo "Env files patched: dev=$DEV_DB test=$TEST_DB"
