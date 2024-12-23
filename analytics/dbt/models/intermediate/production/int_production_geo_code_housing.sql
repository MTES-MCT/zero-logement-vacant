SELECT 
    h.geo_code as geo_code, 
    COUNT(DISTINCT h.id) as count_housing,
    SUM(CASE WHEN h.occupancy= 'V' THEN 1 ELSE 0 END) as count_vacant_housing,
    SUM(CASE WHEN h.occupancy= 'L' THEN 1 ELSE 0 END) as count_rented_housing
FROM {{ ref('int_production_housing') }} h 
GROUP BY geo_code