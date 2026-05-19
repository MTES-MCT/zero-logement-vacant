-- Test: int_zlovac_housing.living_area within plausible bounds.
-- Warn-only: real data contains outliers (cadastral errors). Fail if anything
-- exceeds 100,000 sqm which is clearly nonsense for residential housing.

{{ config(severity='warn', warn_if='>100', error_if='>0') }}

SELECT
    local_id,
    living_area,
    'living_area > 100000 sqm — likely cadastral error' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE living_area IS NOT NULL
  AND (living_area < 0 OR living_area > 100000)
