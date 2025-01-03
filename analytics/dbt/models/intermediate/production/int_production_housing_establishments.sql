{{
    config(
        materialized='table'
    )
}}
WITH deduplicated_pel AS (
    SELECT DISTINCT geo_code, establishment_id
    FROM {{ ref('int_production_establishments_localities') }}
),
filtered_ph AS (
    SELECT id AS housing_id, geo_code
    FROM {{ ref('int_production_housing') }}
)
SELECT
    ph.housing_id,
    STRING_AGG(pel.establishment_id, ' | ') AS establishment_ids,
    ARRAY_AGG(pel.establishment_id) AS establishment_ids_array    
FROM filtered_ph AS ph
LEFT JOIN deduplicated_pel AS pel ON pel.geo_code = ph.geo_code
GROUP BY ph.housing_id