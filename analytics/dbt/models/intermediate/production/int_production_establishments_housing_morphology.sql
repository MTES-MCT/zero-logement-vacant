SELECT 
    establishment_id, 
    COUNT(DISTINCT h.id) as count_housing,
    SUM(CASE WHEN occupancy= 'V' THEN 1 ELSE 0 END) as count_vacant_housing,
    SUM(CASE WHEN occupancy= 'L' THEN 1 ELSE 0 END) as count_rented_housing,
FROM {{ ref('int_production_establishments_localities') }} el
JOIN {{ ref('int_production_housing') }} h ON el.geo_code = h.geo_code
GROUP BY establishment_id