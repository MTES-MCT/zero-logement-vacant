-- Test: Vérifier que les dates sont cohérentes
-- La date all_followup doit être >= max(zlv_followup, user_followup)
-- car all_followup représente le dernier événement toutes sources confondues

{{ config(severity='warn', warn_if='>10', error_if='>100') }}

SELECT 
    housing_id, 
    last_event_date_followup,
    last_event_date_user_followup,
    last_event_date_zlv_followup,
    'Date all_followup antérieure à user_followup' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_date_followup IS NOT NULL
  AND last_event_date_user_followup IS NOT NULL
  AND last_event_date_followup < last_event_date_user_followup

UNION ALL

SELECT 
    housing_id, 
    last_event_date_followup,
    last_event_date_user_followup,
    last_event_date_zlv_followup,
    'Date all_followup antérieure à zlv_followup' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_date_followup IS NOT NULL
  AND last_event_date_zlv_followup IS NOT NULL
  AND last_event_date_followup < last_event_date_zlv_followup

UNION ALL

SELECT 
    housing_id, 
    last_event_date_occupancy,
    last_event_date_user_occupancy,
    last_event_date_zlv_occupancy,
    'Date all_occupancy antérieure à user_occupancy' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_date_occupancy IS NOT NULL
  AND last_event_date_user_occupancy IS NOT NULL
  AND last_event_date_occupancy < last_event_date_user_occupancy

UNION ALL

SELECT 
    housing_id, 
    last_event_date_occupancy,
    last_event_date_user_occupancy,
    last_event_date_zlv_occupancy,
    'Date all_occupancy antérieure à zlv_occupancy' as issue
FROM {{ ref('int_production_housing_last_status') }}
WHERE last_event_date_occupancy IS NOT NULL
  AND last_event_date_zlv_occupancy IS NOT NULL
  AND last_event_date_occupancy < last_event_date_zlv_occupancy
