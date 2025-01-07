SELECT
    pg.*
FROM {{ ref ('stg_production_geo_perimeters') }} pg
WHERE pg.created_by IS NOT NULL
