#!/bin/bash
# Run DuckDB stats queries for a LOVAC entity and save results as JSON.
# One output file is produced per query file (entity-<suffix>).
# Also renders a bar chart in the terminal via Youplot for category/value results.
#
# Usage:
#   ./stats/snapshot.sh <entity> <label> <DATABASE_URL>
#
# entity: owners | housings | housing-owners | events
# label:  pre | post (or any string)
# DATABASE_URL: postgres://user:pass@host/dbname
#
# Output:
#   snapshot-<entity>-<suffix>-<label>.json (in current directory)
set -euo pipefail

ENTITY="${1:?Usage: $0 <entity> <label> <DATABASE_URL>}"
LABEL="${2:?Usage: $0 <entity> <label> <DATABASE_URL>}"
DATABASE_URL="${3:?Usage: $0 <entity> <label> <DATABASE_URL>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUERIES_DIR="${SCRIPT_DIR}/queries"

# Normalize URL: DuckDB postgres extension requires postgresql:// scheme
PG_URL="${DATABASE_URL/postgres:\/\//postgresql://}"

TEMP_SQL=$(mktemp /tmp/duckdb-query.XXXXXX.sql)
trap 'rm -f "$TEMP_SQL"' EXIT

shopt -s nullglob
QUERY_FILES=("${QUERIES_DIR}/${ENTITY}-"*.sql)

if [ ${#QUERY_FILES[@]} -eq 0 ]; then
  echo "Error: no query files found for entity '${ENTITY}' in ${QUERIES_DIR}" >&2
  exit 1
fi

for QUERY_FILE in "${QUERY_FILES[@]}"; do
  BASENAME="$(basename "$QUERY_FILE" .sql)"   # e.g. owners-metrics
  SUFFIX="${BASENAME#"${ENTITY}-"}"            # e.g. metrics
  OUTPUT_FILE="snapshot-${ENTITY}-${SUFFIX}-${LABEL}.json"

  echo "Running ${ENTITY}/${SUFFIX} stats (${LABEL})..."

  # Rewrite the ATTACH line to use the provided DATABASE_URL
  python3 - "$QUERY_FILE" "$PG_URL" > "$TEMP_SQL" <<'PYEOF'
import sys, re
query_file, pg_url = sys.argv[1], sys.argv[2]
with open(query_file) as f:
    sql = f.read()
sql = re.sub(r"ATTACH\s+'[^']*'\s+AS\s+pg[^;]*;",
             f"ATTACH '{pg_url}' AS pg (TYPE postgres);",
             sql)
print(sql)
PYEOF

  RESULT=$(duckdb -json < "$TEMP_SQL")
  echo "$RESULT" > "$OUTPUT_FILE"
  echo "Saved to ${OUTPUT_FILE}"

  # Render bar chart if youplot is available and result has category+value rows
  if command -v uplot &>/dev/null; then
    CHART_DATA=$(echo "$RESULT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
rows = [r for r in data if 'category' in r and r['category'] is not None]
for row in rows:
    print(f\"{row['category']}\t{row['value']}\")
" 2>/dev/null || true)
    if [ -n "$CHART_DATA" ]; then
      echo ""
      echo "=== ${ENTITY}/${SUFFIX} (${LABEL}) ==="
      echo "$CHART_DATA" | uplot bar --delimiter="\t" --title="${ENTITY}/${SUFFIX} (${LABEL})" 2>/dev/null || true
    fi
  fi
done
