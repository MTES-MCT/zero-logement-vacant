WITH old_events_raw AS (
    SELECT
        id,
        CAST(created_at AS DATE) AS created_at,
        created_by,
        old_events.housing_id,
        NULL AS owner_id,
        NULL AS old_status,
        NULL AS new_status_raw,
        NULL AS old_status_raw,
        CASE
            WHEN LOWER(content) LIKE '%jamais contacté%' THEN 0
            WHEN LOWER(content) LIKE '%non suivi%' THEN 0
            WHEN LOWER(content) LIKE '%en attente de retour%' THEN 1
            WHEN LOWER(content) LIKE '%premier contact%' THEN 2
            WHEN LOWER(content) LIKE '%suivi en cours%' THEN 3
            WHEN LOWER(content) LIKE '%non-vacant%' THEN 4
            WHEN LOWER(content) LIKE '%suivi terminé%' THEN 4
            WHEN LOWER(content) LIKE '%bloqué%' THEN 5
            WHEN LOWER(content) LIKE '%sortie de la vacance%' THEN 4
            ELSE NULL
        END AS new_status,
        CASE
            WHEN LOWER(content) LIKE '%passage à non-vacant%' THEN 'V'
            ELSE NULL
        END AS old_occupancy,
        CASE
            WHEN
                LOWER(content) LIKE '%passage à non-vacant%'
                AND LOWER(content) LIKE '%propriétaire%' THEN 'P'
            WHEN
                LOWER(content) LIKE '%passage à non-vacant%'
                AND (
                    LOWER(content) LIKE '%loué%'
                    OR LOWER(content) LIKE '%location%'
                ) THEN 'L'
            WHEN LOWER(content) LIKE '%passage à non-vacant%' THEN 'inconnu'
            ELSE NULL
        END AS new_occupancy,
        CASE
            WHEN
                LOWER(content) LIKE '%sortie de la vacance%'
                THEN 'Sortie de la vacance'
            WHEN
                LOWER(content) LIKE '%via accompagnement%'
                THEN 'Sortie de la vacance'
            WHEN
                LOWER(content) LIKE '%via intervention publique%'
                THEN 'Sortie de la vacance'
            WHEN
                LOWER(content) LIKE '%sans accompagnement%'
                THEN 'Sortie de la vacance'
            WHEN
                LOWER(content) LIKE '%absent du millésime suivant%'
                THEN 'Sortie de la vacance'
            WHEN LOWER(content) LIKE '%non-vacant%' THEN 'N''était pas vacant'
            WHEN LOWER(content) LIKE '%npai%' THEN 'NPAI'
            WHEN
                LOWER(content) LIKE '%vacance volontaire%'
                THEN 'Vacance volontaire du propriétaire'
            WHEN
                LOWER(content) LIKE '%mauvaise expérience locative%'
                THEN 'Vacance volontaire du propriétaire'
            WHEN
                LOWER(content) LIKE '%rejet formel de l''accompagnement%'
                THEN 'Vacance volontaire du propriétaire'
            WHEN
                LOWER(content) LIKE '%blocage juridique%'
                THEN 'Vacance involontaire lié au propriétaire'
            WHEN
                LOWER(content) LIKE '%liée au propriétaire%'
                THEN 'Vacance involontaire lié au propriétaire'
            WHEN
                LOWER(content) LIKE '%projet qui n''aboutit pas%'
                THEN 'Vacance involontaire lié au propriétaire'
            WHEN
                LOWER(content) LIKE '%mauvais état%'
                THEN 'Immeuble / Environnement'
            ELSE NULL
        END AS new_sub_status,
        content AS name,
        'old' AS version,
        NULL AS category
    FROM
    {{ ref ('stg_production_old_events') }} AS old_events
),

old_events_with_flags AS (
    SELECT
        *,
        CASE
            WHEN new_status IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS status_changed,
        CASE
            WHEN new_occupancy IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS occupancy_changed
    FROM
        old_events_raw
)

SELECT
    id,
    created_at,
    created_by,
    housing_id,
    -- Type synthétique pour compatibilité avec get_last_event_status qui filtre sur type
    -- CORRECTION BUG: Sans ce type, les anciens événements étaient exclus du calcul
    CASE 
        WHEN new_status IS NOT NULL THEN 'housing:status-updated'
        WHEN new_occupancy IS NOT NULL THEN 'housing:occupancy-updated'
        ELSE NULL
    END AS type,
    owner_id,
    new_status,
    new_sub_status,
    name,
    -- simple_name synthétique pour cohérence avec les nouveaux événements
    CASE 
        WHEN new_status IS NOT NULL THEN 'suivi'
        WHEN new_occupancy IS NOT NULL THEN 'occupation'
        ELSE NULL
    END AS simple_name,
    status_changed,
    new_status_raw,
    old_status_raw,
    occupancy_changed,
    new_occupancy,
    old_occupancy,
    version,
    category
FROM
    old_events_with_flags
