-- Test: Vérifier que si un statut numérique existe, le label existe aussi
-- Cela vérifie la cohérence du mapping avec la seed 'status'

SELECT 
    housing_id,
    last_event_status_user_followup,
    last_event_status_label_user_followup,
    'Label manquant alors que le statut existe' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_user_followup IS NOT NULL
AND last_event_status_label_user_followup IS NULL

UNION ALL

SELECT 
    housing_id,
    last_event_status_zlv_followup,
    last_event_status_label_zlv_followup,
    'Label ZLV manquant alors que le statut existe' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_zlv_followup IS NOT NULL
AND last_event_status_label_zlv_followup IS NULL

