#!/bin/bash -l
#
# Daily cron: flip NEVER_CONTACTED housings of campaigns whose sending date has
# passed to WAITING. See docs/superpowers/plans/2026-07-15-campaign-sending-date-status.md
#
# `-l` (login shell) is required on Clever Cloud: cron scripts run in a
# non-login shell by default, which does not source the app environment. Without
# it neither the injected env vars (the database connection this script needs via
# ~/infra/config) nor the Node/Yarn toolchain on PATH are available, and the cron
# fails to start. See https://www.clever.cloud/developers/doc/administrate/cron/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$SERVER_DIR"
NODE_OPTIONS='--import tsx/esm' yarn tsx src/scripts/flip-sent-campaign-housings/index.ts
