WITH
housing_status_zlv_followup AS {{ get_last_event_status ('zlv', 'suivi') }},
housing_status_user_followup AS {{ get_last_event_status ('user', 'suivi') }},
housing_status_all_followup AS {{ get_last_event_status (None,
'suivi',
true) }},
housing_status_zlv_occupancy AS {{ get_last_event_status ('zlv',
"occupation") }},
housing_status_user_occupancy AS {{ get_last_event_status ('user',
"occupation") }},
housing_status_all_occupancy AS {{ get_last_event_status (None,
"occupation",
true) }},

-- Application de la macro pour sélectionner la dernière ligne pour chaque catégorie

last_housing_status_zlv_followup AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_zlv_followup',
'zlv_followup') }},
last_housing_status_user_followup AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_user_followup',
'user_followup') }},
last_housing_status_all_followup AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_all_followup',
'followup') }},
last_housing_status_zlv_occupancy AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_zlv_occupancy',
'zlv_occupancy') }},
last_housing_status_user_occupancy AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_user_occupancy',
'user_occupancy') }},
last_housing_status_all_occupancy AS {{ select_last_event (ref ('int_production_housing'),
'housing_status_all_occupancy',
'occupancy') }}

SELECT
h.id AS housing_id,
hszf.last_event_status_zlv_followup,
hszf.last_event_status_label_zlv_followup,
hszf.last_event_date_zlv_followup,
hsuf.last_event_status_user_followup,
hsuf.last_event_status_label_user_followup,
hsuf.last_event_date_user_followup,
hsuf.last_event_sub_status_label_user_followup,
hsf.last_event_status_followup,
hsf.last_event_status_label_followup,
hsf.last_event_date_followup,
hszo.last_event_status_zlv_occupancy,
hszo.last_event_status_label_zlv_occupancy,
hszo.last_event_date_zlv_occupancy,
hsuo.last_event_status_user_occupancy,
hsuo.last_event_status_label_user_occupancy,
hsuo.last_event_date_user_occupancy,
hsuo.last_event_sub_status_label_user_occupancy,
hso.last_event_status_occupancy,
hso.last_event_status_label_occupancy,
hso.last_event_date_occupancy
FROM {{ ref ('int_production_housing') }} AS h
LEFT JOIN last_housing_status_zlv_followup AS hszf ON h.id = hszf.housing_id
LEFT JOIN last_housing_status_user_followup AS hsuf ON h.id = hsuf.housing_id
LEFT JOIN last_housing_status_all_followup AS hsf ON h.id = hsf.housing_id
LEFT JOIN last_housing_status_zlv_occupancy AS hszo ON h.id = hszo.housing_id
LEFT JOIN last_housing_status_user_occupancy AS hsuo ON h.id = hsuo.housing_id
LEFT JOIN last_housing_status_all_occupancy AS hso ON h.id = hso.housing_id
