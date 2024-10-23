WITH old_events AS (
        SELECT
        id,
        created_at,
        created_by,
        old_events.housing_id,
        NULL AS old_status,
        NULL AS new_status_raw,
        NULL AS old_status_raw,
        CASE
            WHEN lower(content) LIKE '%jamais contacté%' THEN 0
            WHEN lower(content) LIKE '%non suivi%' THEN 0
            WHEN lower(content) LIKE '%en attente de retour%' THEN 1
            WHEN lower(content) LIKE '%premier contact%' THEN 2
            WHEN lower(content) LIKE '%suivi en cours%' THEN 3
            WHEN lower(content) LIKE '%non-vacant%' THEN 4
            WHEN lower(content) LIKE '%suivi terminé%' THEN 4
            WHEN lower(content) LIKE '%bloqué%' THEN 5
            WHEN lower(content) LIKE '%sortie de la vacance%' THEN 4
            ELSE NULL
        END AS new_status,
        CASE
            WHEN lower(content) LIKE '%passage à non-vacant%' THEN 'V'    
            ELSE NULL
        END AS old_occupancy,
        CASE
            WHEN lower(content) LIKE '%passage à non-vacant%'  AND lower(content) LIKE '%propriétaire%' THEN 'P'
            WHEN lower(content) LIKE '%passage à non-vacant%'  AND (lower(content) LIKE '%loué%' OR lower(content) LIKE '%location%') THEN 'L'
            WHEN lower(content) LIKE '%passage à non-vacant%' THEN 'inconnu'
            ELSE NULL
        END AS new_occupancy,
        CASE
            WHEN lower(content) LIKE '%sortie de la vacance%' THEN 'Sortie de la vacance'
            WHEN lower(content) LIKE '%via accompagnement%' THEN 'Sortie de la vacance'
            WHEN lower(content) LIKE '%via intervention publique%' THEN 'Sortie de la vacance'
            WHEN lower(content) LIKE '%sans accompagnement%' THEN 'Sortie de la vacance'
            WHEN lower(content) LIKE '%absent du millésime suivant%' THEN 'Sortie de la vacance'
            WHEN lower(content) LIKE '%non-vacant%' THEN 'N''était pas vacant'
            WHEN lower(content) LIKE '%npai%' THEN 'NPAI'
            WHEN lower(content) LIKE '%vacance volontaire%' THEN 'Vacance volontaire du propriétaire'
            WHEN lower(content) LIKE '%mauvaise expérience locative%' THEN 'Vacance volontaire du propriétaire'
            WHEN lower(content) LIKE '%rejet formel de l''accompagnement%' THEN 'Vacance volontaire du propriétaire'
            WHEN lower(content) LIKE '%blocage juridique%' THEN 'Vacance involontaire lié au propriétaire'
            WHEN lower(content) LIKE '%liée au propriétaire%' THEN 'Vacance involontaire lié au propriétaire'
            WHEN lower(content) LIKE '%projet qui n''aboutit pas%' THEN 'Vacance involontaire lié au propriétaire'
            WHEN lower(content) LIKE '%mauvais état%' THEN 'Immeuble / Environnement'
            ELSE NULL
        END AS new_sub_status,
        content as name,
        NULL as simple_name,
        'old' as version
    FROM {{ ref('stg_production_old_events') }} AS old_events
    WHERE lower(content) LIKE '%passage à%'
) 
    SELECT *,
    CASE WHEN new_status IS NOT NULL THEN TRUE ELSE FALSE END AS status_changed, 
    CASE WHEN new_occupancy IS NOT NULL THEN TRUE ELSE FALSE END AS occupancy_changed
    FROM old_events
