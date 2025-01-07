SELECT
    pg.establishment_id,
    TRUE AS has_groups,
    COUNT(DISTINCT pg.id) AS total_groups,
    SUM(CASE WHEN pg.exported_at IS NOT NULL THEN 1 END)
        AS total_exported_groups,
    MAX(pg.created_at) AS last_group_created,
    MIN(pg.created_at) AS first_group_created
FROM {{ ref ('int_production_groups') }} pg
GROUP BY pg.establishment_id
