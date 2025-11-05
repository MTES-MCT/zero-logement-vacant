SELECT
    id,
    e.created_at,
    e.created_by,
    he.housing_id,
    ho.owner_id,
    CASE
        WHEN e.type = 'housing:status-updated' THEN
            CASE
                WHEN lower(e.next_new ->> 'status') = 'non suivi' THEN 0
                WHEN lower(e.next_new ->> 'status') = 'jamais contacté' THEN 0
                WHEN lower(e.next_new ->> 'status') = 'en attente de retour' THEN 1
                WHEN lower(e.next_new ->> 'status') = 'premier contact' THEN 2
                WHEN lower(e.next_new ->> 'status') = 'suivi en cours' THEN 3
                WHEN lower(e.next_new ->> 'status') = 'non-vacant' THEN 4
                WHEN lower(e.next_new ->> 'status') = 'suivi terminé' THEN 4
                WHEN lower(e.next_new ->> 'status') = 'sortie de la vacance' THEN 4
                WHEN lower(e.next_new ->> 'status') = 'bloqué' THEN 5
            END
    END as new_status,
    e.next_new ->> 'subStatus' as new_sub_status,
    case 
        when e.type = 'housing:status-updated' then 'Changement de statut de suivi'
        when e.type = 'housing:occupancy-updated' then 'Modification du statut d''occupation'
        else e.type
    end as name,
    CASE
        WHEN e.type = 'housing:status-updated' THEN 'suivi'
        WHEN e.type = 'housing:occupancy-updated' THEN 'occupation'
    END AS simple_name,
    (e.next_new ->> 'status') IS DISTINCT FROM(e.next_old ->> 'status') AS status_changed,
    e.next_new ->> 'status' AS new_status_raw,
    e.next_old ->> 'status' AS old_status_raw,
    (e.next_new ->> 'occupancy') IS DISTINCT FROM (e.next_old ->> 'occupancy') AS occupancy_changed,
    e.next_new ->> 'occupancy' AS new_occupancy,
    e.next_old ->> 'occupancy' AS old_occupancy,
    'new' AS version,
    split_part(type, ':', 1) as category, 
    type
FROM {{ ref('stg_production_events') }} e
LEFT JOIN {{ ref('stg_production_housing_events') }} he ON e.id = he.event_id
LEFT JOIN {{ ref('stg_production_owner_events') }} ho ON e.id = ho.event_id
WHERE e.type IN('housing:status-updated', 'housing:occupancy-updated')
