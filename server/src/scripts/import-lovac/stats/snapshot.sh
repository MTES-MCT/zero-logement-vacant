#!/bin/bash
# Run DuckDB stats query for a LOVAC entity and save results as JSON.
# Also renders a bar chart in the terminal via Youplot.
#
# Usage:
#   ./stats/snapshot.sh <entity> <label> <DATABASE_URL>
#
# entity: owners | housings | housing-owners | events
# label:  pre | post (or any string)
# DATABASE_URL: postgres://user:pass@host/dbname
#
# Output:
#   snapshot-<entity>-<label>.json (in current directory)
set -euo pipefail

ENTITY="${1:?Usage: $0 <entity> <label> <DATABASE_URL>}"
LABEL="${2:?Usage: $0 <entity> <label> <DATABASE_URL>}"
DATABASE_URL="${3:?Usage: $0 <entity> <label> <DATABASE_URL>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUERY_FILE="${SCRIPT_DIR}/queries/${ENTITY}.sql"
OUTPUT_FILE="snapshot-${ENTITY}-${LABEL}.json"

if [ ! -f "$QUERY_FILE" ]; then
  echo "Error: query file not found: $QUERY_FILE" >&2
  exit 1
fi

echo "Running ${ENTITY} stats (${LABEL})..."

# DuckDB uses its own postgres URI format; extract components
# DATABASE_URL format: postgres://user:pass@host:port/dbname
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|postgres://[^@]+@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|postgres://[^@]+@[^:]+:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|postgres://[^:]+:([^@]+)@.*|\1|')

# Run DuckDB with the postgres secret and capture JSON output
RESULT=$(duckdb -json -c "
  INSTALL postgres;
  LOAD postgres;
  CREATE SECRET pg_secret (
    TYPE postgres,
    HOST '${DB_HOST}',
    PORT ${DB_PORT:-5432},
    DATABASE '${DB_NAME}',
    USER '${DB_USER}',
    PASSWORD '${DB_PASS}'
  );
  $(cat "$QUERY_FILE" | sed 's|ATTACH.*AS pg.*||g' | sed "s|pg\\.||g")
" 2>/dev/null || duckdb :memory: -json < "$QUERY_FILE")

echo "$RESULT" > "$OUTPUT_FILE"
echo "Saved to ${OUTPUT_FILE}"

# Render bar chart if youplot is available and result has category+value
if command -v uplot &>/dev/null; then
  echo ""
  echo "=== ${ENTITY} (${LABEL}) ==="
  # Extract top-level metric rows for bar chart (category, value columns)
  echo "$RESULT" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
if isinstance(data, list) and data and 'category' in data[0]:
    for row in data:
        print(f\"{row['category']}\t{row['value']}\")
" | uplot bar --delimiter="\t" --title="${ENTITY} (${LABEL})" 2>/dev/null || true
fi
