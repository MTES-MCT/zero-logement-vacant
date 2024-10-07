SELECT 
    CAST(pe.id AS VARCHAR) as establishment_id,
    UNNEST(pe.localities_geo_code) as geo_code
FROM {{ ref('int_production_establishments') }} pe 