SELECT 
    pc.establishment_id,
    COUNT(DISTINCT pc.name) as total_perimeters,
    COUNT(*) as total_shapes,
    COUNT(DISTINCT pc.kind) as total_kinds
FROM {{ ref('int_production_geo_perimeters')}} pc
GROUP BY pc.establishment_id
