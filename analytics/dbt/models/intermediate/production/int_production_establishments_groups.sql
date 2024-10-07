SELECT 
    pg.establishment_id,
    COUNT(DISTINCT pg.id) as total_groups,
    SUM(CASE WHEN pg.exported_at IS NOT NULL THEN 1 END) as total_exported_groups,
    MAX(pg.created_at) as last_group_created,
    MIN(pg.created_at) as first_group_created,
FROM {{ ref('int_production_groups')}} pg
GROUP BY pg.establishment_id
