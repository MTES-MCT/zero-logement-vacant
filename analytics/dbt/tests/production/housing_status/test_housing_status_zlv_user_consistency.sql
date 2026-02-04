-- Test: Vérifier la cohérence entre les statuts ZLV, user et all
-- Si user_followup existe, all_followup devrait aussi exister
-- Si zlv_followup existe, all_followup devrait aussi exister
-- Note: Peut y avoir des cas légitimes où le dernier event all est différent

{{ config(severity='warn', warn_if='>100', error_if='>1000') }}

SELECT 
    housing_id, 
    last_event_status_user_followup,
    last_event_status_followup,
    'User followup sans all followup' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_user_followup IS NOT NULL
  AND last_event_status_followup IS NULL

UNION ALL

SELECT 
    housing_id, 
    last_event_status_zlv_followup,
    last_event_status_followup,
    'ZLV followup sans all followup' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_zlv_followup IS NOT NULL
  AND last_event_status_followup IS NULL

UNION ALL

SELECT 
    housing_id, 
    last_event_status_user_occupancy,
    last_event_status_occupancy,
    'User occupancy sans all occupancy' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_user_occupancy IS NOT NULL
  AND last_event_status_occupancy IS NULL

UNION ALL

SELECT 
    housing_id, 
    last_event_status_zlv_occupancy,
    last_event_status_occupancy,
    'ZLV occupancy sans all occupancy' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_status_zlv_occupancy IS NOT NULL
  AND last_event_status_occupancy IS NULL
