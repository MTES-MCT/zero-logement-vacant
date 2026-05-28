-- Test: int_zlovac_housing.geo_code must be exactly 5 chars
-- INSEE commune codes: 2-digit dept + 3-digit commune, or 97x DOM-TOM.

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    geo_code,
    LENGTH(geo_code) as len,
    'geo_code length != 5' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE geo_code IS NOT NULL
  AND LENGTH(geo_code) <> 5
