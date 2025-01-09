WITH 
    establishment_status_user_followup AS {{ get_last_establishment_event_status('user', 'suivi') }},
    establishment_status_user_occupancy AS {{ get_last_establishment_event_status('user', "occupation") }},
    last_establishment_status_user_followup AS {{ select_last_establishment_event(ref('int_production_establishments'), 'establishment_status_user_followup', 'user_followup') }},
    last_establishment_status_user_occupancy AS {{ select_last_establishment_event(ref('int_production_establishments'), 'establishment_status_user_occupancy', 'user_occupancy') }}

SELECT
    e.id AS establishment_id,
    hsuf.last_event_status_user_followup,
    hsuf.last_event_status_label_user_followup,
    hsuf.last_event_date_user_followup,
    hsuf.last_event_sub_status_label_user_followup,
    hszo.last_event_occupancy_user_occupancy,
    hszo.last_event_date_user_occupancy
FROM {{ ref('int_production_establishments') }} AS e
LEFT JOIN last_establishment_status_user_followup AS hsuf ON e.id = hsuf.establishment_id
LEFT JOIN last_establishment_status_user_occupancy AS hszo ON e.id = hszo.establishment_id