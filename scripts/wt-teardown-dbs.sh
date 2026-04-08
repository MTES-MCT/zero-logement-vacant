#!/usr/bin/env bash
# Drops branch-specific dev and test databases when a worktree is removed.
# Usage (called by wt pre-remove hook):
#   bash scripts/wt-teardown-dbs.sh <branch_db_suffix>

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <branch_db_suffix>" >&2
  exit 1
fi

SUFFIX="$1"
DEV_DB="dev_${SUFFIX}"
TEST_DB="test_${SUFFIX}"

docker exec zlv dropdb -U postgres --if-exists "$DEV_DB" \
  && echo "Dropped database: $DEV_DB" \
  || echo "Warning: could not drop $DEV_DB (container not running?)"

docker exec zlv dropdb -U postgres --if-exists "$TEST_DB" \
  && echo "Dropped database: $TEST_DB" \
  || echo "Warning: could not drop $TEST_DB (container not running?)"
