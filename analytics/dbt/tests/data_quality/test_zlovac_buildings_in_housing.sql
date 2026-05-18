-- Test: every building_id in int_zlovac_buildings must appear in int_zlovac_housing.
-- Buildings table is derived from housing, so this should always hold.

{{ config(severity='error', error_if='>0') }}

SELECT
    b.building_id,
    'building_id missing from int_zlovac_housing' as issue
FROM {{ ref('int_zlovac_buildings') }} b
LEFT JOIN (
    SELECT DISTINCT building_id FROM {{ ref('int_zlovac_housing') }} WHERE building_id IS NOT NULL
) h USING (building_id)
WHERE h.building_id IS NULL
