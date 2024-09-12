SELECT phg.housing_id, 
    COUNT(DISTINCT pg.id) as total_groups,
    STRING_AGG(pg.title, ', ') as group_titles,
    MIN(pg.created_at) as first_group_created,
    MAX(pg.created_at) as last_group_created,
    MIN(pg.exported_at) as first_group_exported,
    MAX(pg.exported_at) as last_group_exported
FROM {{ ref('stg_production_groups_housing') }} phg
JOIN {{ ref('stg_production_groups') }} pg ON phg.group_id = pg.id
GROUP BY phg.housing_id
