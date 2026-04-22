#!/usr/bin/env bash
set -euo pipefail

FILE="${1:?Usage: $0 <source.jsonl> <pg_url> [work_dir]}"
PG_URL="${2:?Usage: $0 <source.jsonl> <pg_url> [work_dir]}"
WORK_DIR="${3:-$(mktemp -d /tmp/zlv-prepare-XXXXXX)}"
CHANGES_FILE="${WORK_DIR}/geo_code_changes.parquet"
DEPTS_DIR="${WORK_DIR}/depts"

mkdir -p "${DEPTS_DIR}"

echo "=== Prepare housings ==="
echo "Source:   ${FILE}"
echo "Work dir: ${WORK_DIR}"

duckdb :memory: <<SQL
INSTALL postgres;
LOAD postgres;
ATTACH '${PG_URL}' AS pg (TYPE POSTGRES);

-- 1. Load source JSONL
CREATE TEMP TABLE source AS
  SELECT * FROM read_json_auto('${FILE}');

SELECT COUNT(*)::BIGINT AS source_rows FROM source;

-- 2. Detect geo_code changes (skip if target partition already has a row with same local_id)
CREATE TEMP TABLE changes AS
  SELECT h.id, s.geo_code AS new_geo_code
  FROM pg.fast_housing h
  JOIN source s ON h.local_id = s.local_id
  WHERE h.geo_code != s.geo_code
  AND NOT EXISTS (
    SELECT 1 FROM pg.fast_housing existing
    WHERE existing.geo_code = s.geo_code
    AND existing.local_id = s.local_id
    AND existing.id != h.id
  );

SELECT COUNT(*)::BIGINT AS geo_code_changes FROM changes;

-- 3. Write changes parquet (for audit/report)
COPY changes TO '${CHANGES_FILE}' (FORMAT PARQUET);

-- 4. Apply geo_code corrections directly in PostgreSQL
CREATE TABLE pg.housing_geo_code_changes_tmp (
  id UUID NOT NULL,
  new_geo_code VARCHAR(5) NOT NULL
);

INSERT INTO pg.housing_geo_code_changes_tmp
  SELECT id, new_geo_code FROM changes;

CALL postgres_execute('pg', '
  UPDATE fast_housing h
  SET geo_code = tmp.new_geo_code
  FROM housing_geo_code_changes_tmp tmp
  WHERE h.id = tmp.id
  AND NOT EXISTS (
    SELECT 1 FROM fast_housing existing
    WHERE existing.geo_code = tmp.new_geo_code
    AND existing.local_id = h.local_id
    AND existing.id != h.id
  )
');

CALL postgres_execute('pg', 'DROP TABLE IF EXISTS housing_geo_code_changes_tmp');

-- 5. Split source by department into hive-partitioned parquet
COPY (
  SELECT *, geo_code[1:2] AS dept
  FROM source
) TO '${DEPTS_DIR}' (FORMAT PARQUET, PARTITION_BY (dept), OVERWRITE_OR_IGNORE);

SQL

DEPT_COUNT=$(ls -d "${DEPTS_DIR}"/dept=* 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Done."
echo "  Geo-code changes applied (see ${CHANGES_FILE})"
echo "  Split into ${DEPT_COUNT} department files in ${DEPTS_DIR}"
echo ""
echo "Next: run the Node.js import command with:"
echo "  yarn workspace @zerologementvacant/server import-lovac housings '${DEPTS_DIR}' --from file --year <year>"
