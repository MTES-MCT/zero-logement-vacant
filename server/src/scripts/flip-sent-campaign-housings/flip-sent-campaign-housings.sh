#!/bin/bash
#
# Daily cron: flip NEVER_CONTACTED housings of campaigns whose sending date has
# passed to WAITING. See docs/superpowers/plans/2026-07-15-campaign-sending-date-status.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$SERVER_DIR"
NODE_OPTIONS='--import tsx/esm' yarn tsx src/scripts/flip-sent-campaign-housings/index.ts
