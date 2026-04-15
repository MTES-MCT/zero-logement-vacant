#!/bin/bash
# Trigger the import-lovac Clever Cloud task application.
#
# Usage:
#   ./run-on-clevercloud.sh <subcommand> --year <year> --file <s3-key> [--dry-run] [--abort-early] [--departments <dep...>]
#
# Prerequisites:
#   - clever CLI installed and authenticated (clever login)
#   - ZLV_IMPORT_APP_ID set in your shell profile (never committed)
#
# Example:
#   ./run-on-clevercloud.sh owners --year lovac-2026 --file lovac/owners.jsonl
set -euo pipefail

if [ -z "${ZLV_IMPORT_APP_ID:-}" ]; then
  echo "Error: ZLV_IMPORT_APP_ID is not set. Add it to your shell profile." >&2
  exit 1
fi

SUBCOMMAND=""
YEAR=""
FILE=""
DRY_RUN=""
ABORT_EARLY=""
DEPARTMENTS=""

# Parse arguments
SUBCOMMAND="$1"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --year)
      YEAR="$2"; shift 2 ;;
    --file)
      FILE="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN="1"; shift ;;
    --abort-early)
      ABORT_EARLY="1"; shift ;;
    --departments)
      DEPARTMENTS="$2"; shift 2 ;;
    *)
      echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$SUBCOMMAND" ] || [ -z "$YEAR" ] || [ -z "$FILE" ]; then
  echo "Usage: $0 <subcommand> --year <year> --file <s3-key> [--dry-run] [--abort-early] [--departments <dep...>]" >&2
  exit 1
fi

echo "Setting environment variables on Clever Cloud app ${ZLV_IMPORT_APP_ID}..."
clever env set --app "${ZLV_IMPORT_APP_ID}" \
  IMPORT_SUBCOMMAND="${SUBCOMMAND}" \
  IMPORT_YEAR="${YEAR}" \
  IMPORT_FILE="${FILE}" \
  IMPORT_DRY_RUN="${DRY_RUN}" \
  IMPORT_ABORT_EARLY="${ABORT_EARLY}" \
  IMPORT_DEPARTMENTS="${DEPARTMENTS}"

echo "Restarting task app..."
clever restart --app "${ZLV_IMPORT_APP_ID}" --wait

echo "Tailing logs (Ctrl+C to stop watching, the task continues)..."
clever logs --app "${ZLV_IMPORT_APP_ID}" --follow
