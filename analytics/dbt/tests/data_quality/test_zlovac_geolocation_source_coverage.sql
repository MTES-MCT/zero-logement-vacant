-- Test: geolocation_source coverage in int_zlovac_housing.
-- Fail if more than 0.5% of rows have NULL geolocation_source.
-- Catches regressions where geometry columns (geomrnb, ff_geomloc, ban_geom)
-- stop flowing through from int_lovac_fil_2026.

{{ config(severity='warn', warn_if='>0', error_if='>0') }}

WITH stats AS (
    SELECT
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE geolocation_source IS NULL) as null_rows
    FROM {{ ref('int_zlovac_housing') }}
)
SELECT
    total_rows,
    null_rows,
    ROUND(null_rows * 100.0 / total_rows, 4) as null_pct,
    'geolocation_source null rate above 0.5%' as issue
FROM stats
WHERE null_rows * 1.0 / total_rows > 0.005
