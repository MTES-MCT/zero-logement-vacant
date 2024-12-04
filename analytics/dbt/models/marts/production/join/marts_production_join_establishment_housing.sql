
SELECT 
    establishment_id,
    ec.geo_code, 
    h.id
FROM {{ref('marts_production_join_establishment_cities')}} ec
JOIN {{ ref('int_production_housing') }} h ON ec.geo_code = h.geo_code