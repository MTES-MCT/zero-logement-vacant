-- Test: Vérifier que les statuts de suivi sont des valeurs acceptées
-- Valeurs attendues: 0 (Non-suivi), 1 (En attente), 2 (Premier contact), 
-- 3 (Suivi en cours), 4 (Suivi terminé), 5 (Bloqué)

SELECT 
    housing_id, 
    last_event_status_user_followup, 
    'Statut user_followup invalide' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_user_followup IS NOT NULL
  AND last_event_status_user_followup NOT IN ('0', '1', '2', '3', '4', '5')

UNION ALL

SELECT 
    housing_id, 
    last_event_status_zlv_followup, 
    'Statut zlv_followup invalide' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_zlv_followup IS NOT NULL
  AND last_event_status_zlv_followup NOT IN ('0', '1', '2', '3', '4', '5')

UNION ALL

SELECT 
    housing_id, 
    last_event_status_followup, 
    'Statut all_followup invalide' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_followup IS NOT NULL
  AND last_event_status_followup NOT IN ('0', '1', '2', '3', '4', '5')
