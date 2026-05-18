-- Fails if rnb_footprint is not a valid geometry column.
-- ff_rnb_emp (BIGINT counter) was wrongly used before; geomrnb is the geometry
-- column from cerema_lovac_2026_raw (currently a POINT 4326 centroid representing
-- the RNB building location; future RNB releases may upgrade to POLYGON outlines).
--
-- Thresholds rationale (observed on MotherDuck at time of writing):
--   * ~676,910 / 976,636 ≈ 69% of buildings have a populated rnb_footprint
--   * 100% of populated values parse as valid POINT geometries today
-- We enforce:
--   1. >= 40% populated — leaves headroom for upstream RNB enrichment drift in
--      future raw-source refreshes without spurious failures.
--   2. >= 95% valid among populated — catches bulk hex-WKB encoding regressions
--      while tolerating a handful of malformed rows from upstream.
-- An empty-dataset guard (total > 0) prevents spurious failures on empty/dev
-- builds where no rows exist yet.
--
-- Parse-error handling: ST_GeomFromHEXWKB raises on malformed hex, which would
-- abort the test rather than count as invalid. We pre-filter to strings that
-- look like hex (regex) before calling ST_GeomFromHEXWKB so bad rows fall
-- through as NULL gtype and are counted (correctly) as invalid.
WITH parsed AS (
    SELECT
        rnb_footprint,
        CASE
            WHEN rnb_footprint IS NOT NULL
                 AND regexp_matches(rnb_footprint, '^[0-9A-Fa-f]+$')
            THEN ST_GeometryType(ST_GeomFromHEXWKB(rnb_footprint))
            ELSE NULL
        END AS gtype
    FROM {{ ref('int_zlovac_buildings') }}
),
stats AS (
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE rnb_footprint IS NOT NULL) AS populated,
        COUNT(*) FILTER (
            WHERE rnb_footprint IS NOT NULL
              AND gtype IN ('POINT', 'POLYGON', 'MULTIPOLYGON')
        ) AS valid_geometries
    FROM parsed
)
SELECT *
FROM stats
WHERE total > 0
  AND (
    populated = 0
    OR populated::DOUBLE / total < 0.4
    OR valid_geometries::DOUBLE / NULLIF(populated, 0) < 0.95
  )
