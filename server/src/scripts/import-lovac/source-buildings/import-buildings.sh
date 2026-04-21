#!/usr/bin/env bash
set -euo pipefail

FILE="${1:?Usage: $0 <file> <pg_url> [report_file]}"
PG_URL="${2:?Usage: $0 <file> <pg_url> [report_file]}"
REPORT_FILE="${3:-import-lovac-buildings.report.json}"

echo "Importing buildings from ${FILE}..."
echo "Report will be written to ${REPORT_FILE}"

duckdb :memory: <<SQL
ATTACH '${PG_URL}' AS pg (TYPE POSTGRES);

-- Load source file into memory once
CREATE TEMP TABLE source AS
  SELECT * FROM read_json_auto('${FILE}');

-- Snapshot before
CREATE TEMP TABLE before_count AS
  SELECT COUNT(*)::BIGINT AS n FROM pg.buildings;

-- Bulk insert, skip existing ids
INSERT INTO pg.buildings (id, rnb_id, rnb_id_score, rnb_footprint, housing_count, vacant_housing_count)
SELECT
  building_id  AS id,
  rnb_id,
  rnb_id_score,
  rnb_footprint,
  0            AS housing_count,
  0            AS vacant_housing_count
FROM source
ON CONFLICT (id) DO NOTHING;

-- Write report
COPY (
  WITH
    src    AS (SELECT COUNT(*)::BIGINT        AS total,
                      COUNT(rnb_id)::BIGINT   AS with_rnb
               FROM source),
    before AS (SELECT n FROM before_count),
    after  AS (SELECT COUNT(*)::BIGINT AS n FROM pg.buildings)
  SELECT
    src.total                         AS source_total,
    src.with_rnb                      AS source_with_rnb,
    src.total - src.with_rnb          AS source_without_rnb,
    before.n                          AS before_count,
    after.n                           AS after_count,
    after.n  - before.n               AS inserted,
    src.total - (after.n - before.n)  AS skipped
  FROM src, before, after
) TO '${REPORT_FILE}' (FORMAT JSON, ARRAY true);

SELECT 'source_total',  src.total::VARCHAR                    FROM (SELECT COUNT(*) AS total FROM source) src
UNION ALL
SELECT 'inserted',      (after.n - before.n)::VARCHAR         FROM (SELECT COUNT(*) AS n FROM pg.buildings) after, (SELECT n FROM before_count) before
UNION ALL
SELECT 'skipped',       (src.total - (after.n - before.n))::VARCHAR FROM (SELECT COUNT(*) AS total FROM source) src, (SELECT COUNT(*) AS n FROM pg.buildings) after, (SELECT n FROM before_count) before;
SQL

echo ""
echo "Done. Report:"
cat "${REPORT_FILE}"
