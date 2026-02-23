{{
config (
materialized = 'table'
)
}}
WITH establishments_per_geo AS (
    SELECT
        geo_code,
        ARRAY_AGG(DISTINCT establishment_id) AS establishment_ids_array
    FROM {{ ref ('int_production_establishments_localities') }}
    GROUP BY geo_code
)
SELECT
    h.id AS housing_id,
    ARRAY_TO_STRING(e.establishment_ids_array, ' | ') AS establishment_ids,
    e.establishment_ids_array
FROM {{ ref ('int_production_housing') }} h
LEFT JOIN establishments_per_geo e ON e.geo_code = h.geo_code
