-- Test: int_zlovac_housing.local_id must be unique.
-- README guarantees 1:1 with int_lovac_fil_2026 (deduplicated by local_id).
-- Catches regressions where a join multiplies rows.

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    COUNT(*) as n,
    'local_id duplicated in int_zlovac_housing' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE local_id IS NOT NULL
GROUP BY local_id
HAVING COUNT(*) > 1
