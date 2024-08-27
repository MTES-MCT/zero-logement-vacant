WITH establishment_localities AS (SELECT 
    pe.id as establishment_id,
    UNNEST(pe.localities_geo_code) as geo_code
FROM {{ ref('int_production_establishments') }} pe 
)
SELECT 
    el.establishment_id, 
    el.geo_code,
    c.*
FROM establishment_localities el
JOIN {{ ref('int_common_cities') }} c ON el.geo_code = c.insee_code