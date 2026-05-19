-- Test: latitude/longitude must both be NULL or both NOT NULL.

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    latitude_dgfip,
    longitude_dgfip,
    'lat/lon inconsistency: one is NULL, the other is not' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE (latitude_dgfip IS NULL) <> (longitude_dgfip IS NULL)
