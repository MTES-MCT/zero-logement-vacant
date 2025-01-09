SELECT
    pc.establishment_id,
    TRUE AS has_perimeters,
    COUNT(DISTINCT pc.name) AS total_perimeters,
    COUNT(*) AS total_shapes,
    COUNT(DISTINCT pc.kind) AS total_kinds
FROM {{ ref ('int_production_geo_perimeters') }} pc
GROUP BY pc.establishment_id
