-- Test: int_zlovac_housing.building_year within plausible bounds.
-- 0 is the sentinel for "unknown" (see int_zlovac CASE WHEN ff_jannath > 100 ...).

{{ config(severity='warn', warn_if='>100', error_if='>0') }}

SELECT
    local_id,
    building_year,
    'building_year outside [0, current_year+1]' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE building_year IS NOT NULL
  AND (building_year < 0 OR building_year > EXTRACT(YEAR FROM CURRENT_DATE) + 1)
