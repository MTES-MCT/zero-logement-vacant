SELECT 
    establishment_id, 
    h.id as housing_id,
    h.geo_code
FROM {{ ref('int_production_establishments_localities') }} el
JOIN {{ ref('int_production_housing') }} h ON el.geo_code = h.geo_code