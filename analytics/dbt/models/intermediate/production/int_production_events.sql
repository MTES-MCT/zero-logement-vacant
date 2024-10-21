WITH all_events AS (
    -- Sélection des anciens événements
    SELECT 
        id,
        created_at, 
        created_by, 
        old_events."housing_id",
        CASE 
            WHEN lower(old_events."content") LIKE '%jamais contacté%' THEN 0
            WHEN lower(old_events."content") LIKE '%non suivi%' THEN 0
            WHEN lower(old_events."content") LIKE '%en attente de retour%' THEN 1
            WHEN lower(old_events."content") LIKE '%premier contact%' THEN 2
            WHEN lower(old_events."content") LIKE '%suivi en cours%' THEN 3
            WHEN lower(old_events."content") LIKE '%non-vacant%' THEN 4
            WHEN lower(old_events."content") LIKE '%suivi terminé%' THEN 4
            WHEN lower(old_events."content") LIKE '%bloqué%' THEN 5
            WHEN lower(old_events."content") LIKE '%sortie de la vacance%' THEN 4
        END AS new_status, 
        CASE 
            WHEN lower(old_events."content") LIKE '%sortie de la vacance%' 
            THEN 'Sortie de la vacance' 
            ELSE NULL 
        END AS new_sub_status,
        NULL as name,
        NULL as simple_name,
        FALSE as status_changed,
        NULL as new_status,
        NULL as old_status,
        FALSE as occupancy_changed,
        NULL as new_occupancy,
        NULL as old_occupancy
    FROM {{ ref('stg_production_old_events') }} AS old_events
    WHERE lower(old_events."content") LIKE '%passage à%'
    
    UNION
    
    -- Sélection des événements récents avec coalesce pour gérer les NULL
    SELECT 
        id, 
        e.created_at, 
        e.created_by, 
        he."housing_id",
        CASE 
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%jamais contacté%' THEN 0
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%non suivi%' THEN 0
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%en attente de retour%' THEN 1
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%premier contact%' THEN 2
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%suivi en cours%' THEN 3
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%non-vacant%' THEN 4
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%suivi terminé%' THEN 4
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%bloqué%' THEN 5
            WHEN lower(coalesce((e.new -> 'status')::text, '')) LIKE '%sortie de la vacance%' THEN 4
        END AS new_status, 
        (e.new -> 'subStatus')::text AS new_sub_status,
        e.name,
        CASE WHEN 
            e.name = 'Changement de statut de suivi' THEN 'suivi'
            WHEN e.name = 'Modification du statut' THEN 'statut'
            WHEN e.name = 'Modification du statut d''occupation' THEN 'occupation'
        END AS simple_name, 
        CASE WHEN (e.new -> 'status')::varchar != (e.old -> 'status')::varchar THEN TRUE ELSE FALSE END AS status_changed,
        e.new -> 'status' AS new_status,
        e.old -> 'status' AS old_status,
        CASE WHEN (e.new -> 'occupancy')::varchar != (e.old -> 'occupancy')::varchar THEN TRUE ELSE FALSE END AS occupancy_changed
        e.new -> 'occupancy' AS new_occupancy,
        e.old -> 'occupancy' AS old_occupancy
,
    FROM {{ ref('stg_production_events') }} e
    LEFT JOIN {{ ref('stg_production_housing_events') }} he ON e.id = he.event_id
    WHERE e.name IN ('Changement de statut de suivi',
                     'Modification du statut',
                     'Modification du statut d''occupation')
)
SELECT 
    ae.*, 
    s.new AS event_status_label,
    user_type AS user_source
FROM all_events ae
LEFT JOIN {{ ref('int_production_users')}} u ON ae.created_by = u.id
LEFT JOIN {{ ref('status') }} s ON s.status = ae.new_status
