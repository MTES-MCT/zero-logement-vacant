SELECT
    phg.housing_id,
    COUNT(DISTINCT pg.id) AS total_groups,
    STRING_AGG(pg.title, ', ') AS group_titles,
    MIN(pg.created_at) AS first_group_created,
    MAX(pg.created_at) AS last_group_created,
    MIN(pg.exported_at) AS first_group_exported,
    MAX(pg.exported_at) AS last_group_exported
FROM {{ ref ('stg_production_groups_housing') }} phg
JOIN {{ ref ('stg_production_groups') }} pg ON phg.group_id = pg.id
GROUP BY phg.housing_id
