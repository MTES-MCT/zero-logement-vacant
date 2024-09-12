SELECT
    pg.*
FROM {{ ref('stg_production_geo_perimeters') }} pg
WHERE gp.created_by IS NOT NULL
 