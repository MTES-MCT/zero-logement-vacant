WITH all_events AS (
    -- Sélection des anciens événements
    SELECT 
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
        END AS new_sub_status
    FROM {{ ref('stg_production_old_events') }} AS old_events
    WHERE lower(old_events."content") LIKE '%passage à%'
    
    UNION
    
    -- Sélection des événements récents avec coalesce pour gérer les NULL
    SELECT 
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
        (e.new -> 'subStatus')::text AS new_sub_status
    FROM {{ ref('stg_production_events') }} e
    JOIN {{ ref('stg_production_housing_events') }} he ON e.id = he.event_id
    WHERE e.name IN ('Changement de statut de suivi', 'Modification du statut')
)

SELECT 
    ae.*, 
    s.new AS event_status_label,
    CASE WHEN 
        u.email LIKE '%@beta.gouv.fr' THEN 'zlv' 
        ELSE 'user'
    END AS user_source
FROM all_events ae
JOIN {{ ref('int_production_users')}} u ON ae.created_by = u.id
JOIN {{ ref('status') }} s ON s.status = ae.new_status
