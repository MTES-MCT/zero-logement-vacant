-- Test: int_zlovac_housing.rooms_count within plausible bounds.

{{ config(severity='warn', warn_if='>100', error_if='>0') }}

SELECT
    local_id,
    rooms_count,
    'rooms_count out of [0, 100] range' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE rooms_count IS NOT NULL
  AND (rooms_count < 0 OR rooms_count > 100)
