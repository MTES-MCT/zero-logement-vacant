#!/bin/bash
# Entrypoint for the Clever Cloud import-lovac task application.
# Environment variables are set by run-on-clevercloud.sh before restart.
set -euo pipefail

CMD="yarn workspace @zerologementvacant/server tsx \
  src/scripts/import-lovac/cli.ts ${IMPORT_SUBCOMMAND} \
  --from s3 \
  --year ${IMPORT_YEAR} \
  ${IMPORT_FILE}"

if [ "${IMPORT_DRY_RUN:-}" = "1" ]; then
  CMD="$CMD --dry-run"
fi

if [ "${IMPORT_ABORT_EARLY:-}" = "1" ]; then
  CMD="$CMD --abort-early"
fi

if [ -n "${IMPORT_DEPARTMENTS:-}" ]; then
  CMD="$CMD --departments ${IMPORT_DEPARTMENTS}"
fi

exec $CMD
