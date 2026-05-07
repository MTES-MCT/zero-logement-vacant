#!/usr/bin/env bash
set -euo pipefail

# Splits a LOVAC housing-owners JSONL file into one hive-partitioned
# JSONL file per department, so the Node import can consume them in
# parallel (one worker per department).
#
# Usage: prepare-housing-owners.sh <source.jsonl> [work_dir]
#
# Output layout:
#   <work_dir>/depts/dept=01/data_0.jsonl
#   <work_dir>/depts/dept=02/data_0.jsonl
#   ...
#
# Each `data_0.jsonl` is newline-delimited JSON, readable by the
# existing SourceHousingOwnerFileRepository (which routes on the
# `.jsonl` extension).
#
# Implementation note: DuckDB's COPY ... (FORMAT JSON) does not support
# PARTITION_BY (parquet/csv only). We work around it by loading the
# source once into a persistent DuckDB file, listing distinct dept
# codes, then issuing one COPY per department against the loaded
# table.

FILE="${1:?Usage: $0 <source.jsonl> [work_dir]}"
WORK_DIR="${2:-$(mktemp -d /tmp/zlv-prepare-housing-owners-XXXXXX)}"
DEPTS_DIR="${WORK_DIR}/depts"
DUCKDB_FILE="${WORK_DIR}/source.duckdb"

mkdir -p "${DEPTS_DIR}"

echo "=== Prepare housing owners ==="
echo "Source:   ${FILE}"
echo "Work dir: ${WORK_DIR}"

# 1. Load source JSONL into a persistent DuckDB file (one parse, many
#    queries). dept column derived from geo_code so 2A/2B Corsica codes
#    flow through unchanged.
duckdb "${DUCKDB_FILE}" <<SQL
CREATE OR REPLACE TABLE source AS
  SELECT *, geo_code[1:2] AS dept
  FROM read_json_auto('${FILE}');
SELECT COUNT(*)::BIGINT AS source_rows FROM source;
SQL

# 2. Enumerate distinct department codes.
DEPTS=$(duckdb "${DUCKDB_FILE}" -csv -noheader -c "SELECT DISTINCT dept FROM source ORDER BY dept")

# 3. Write one NDJSON file per department.
echo "${DEPTS}" | while IFS= read -r dept; do
  [ -z "${dept}" ] && continue
  mkdir -p "${DEPTS_DIR}/dept=${dept}"
  duckdb "${DUCKDB_FILE}" -c "
    COPY (SELECT * EXCLUDE (dept) FROM source WHERE dept = '${dept}')
    TO '${DEPTS_DIR}/dept=${dept}/data_0.jsonl' (FORMAT JSON, ARRAY false);
  " >/dev/null
  echo "  dept=${dept} done"
done

# 4. Cleanup the loader DuckDB file (keep the per-dept JSONL outputs).
rm "${DUCKDB_FILE}"

DEPT_COUNT=$(ls -d "${DEPTS_DIR}"/dept=* 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Done."
echo "  Split into ${DEPT_COUNT} department directories in ${DEPTS_DIR}"
echo ""
echo "Next: run the Node.js import command with:"
echo "  yarn workspace @zerologementvacant/server import-lovac housing-owners '${DEPTS_DIR}' --from file --year <year>"
