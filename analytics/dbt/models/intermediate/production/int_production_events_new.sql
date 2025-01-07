SELECT
    id,
    e.created_at,
    e.created_by,
    he.housing_id,
    CASE
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%jamais contacté%'
            THEN 0
        WHEN
            lower(coalesce((e.new - > 'status')::text, '')) LIKE '%non suivi%'
            THEN 0
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%en attente de retour%'
            THEN 1
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%premier contact%'
            THEN 2
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%suivi en cours%'
            THEN 3
        WHEN
            lower(coalesce((e.new - > 'status')::text, '')) LIKE '%non-vacant%'
            THEN 4
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%suivi terminé%'
            THEN 4
        WHEN
            lower(coalesce((e.new - > 'status')::text, '')) LIKE '%bloqué%'
            THEN 5
        WHEN
            lower(
                coalesce((e.new - > 'status')::text, '')
            ) LIKE '%sortie de la vacance%'
            THEN 4
    END AS new_status,
    replace((e.new - > 'subStatus'), '"', '')::text AS new_sub_status,
    e.name,
    CASE
        WHEN
            e.name = 'Changement de statut de suivi' THEN 'suivi'
        WHEN e.name = 'Modification du statut d''occupation' THEN 'occupation'
        WHEN e.name = 'Modification du statut' THEN 'statut'
    END AS simple_name,
    CASE
        WHEN
            (e.new - > 'status')::varchar != (e.old - > 'status')::varchar
            THEN TRUE
        ELSE FALSE
    END AS status_changed,
    replace((e.new - > 'status')::varchar, '"', '') AS new_status_raw,
    replace((e.old - > 'status')::varchar, '"', '') AS old_status_raw,
    CASE
        WHEN
            (e.new - > 'occupancy')::varchar != (e.old - > 'occupancy')::varchar
            THEN TRUE
        ELSE FALSE
    END AS occupancy_changed,
    replace((e.new - > 'occupancy')::varchar, '"', '') AS new_occupancy,
    replace((e.old - > 'occupancy')::varchar, '"', '') AS old_occupancy,
    'new' AS version,
    category
FROM {{ ref ('stg_production_events') }} e
LEFT JOIN {{ ref ('stg_production_housing_events') }} he ON e.id = he.event_id
