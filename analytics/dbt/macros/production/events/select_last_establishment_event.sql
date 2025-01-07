{ % macro select_last_establishment_event (establishment_table,
event_table,
column_suffix) % }
(
SELECT
e.id AS establishment_id,
evt.status AS last_event_status_ {{ column_suffix }},
evt.status_label AS last_event_status_label_ {{ column_suffix }},
evt.occupancy AS last_event_occupancy_ {{ column_suffix }},
evt.new_sub_status AS last_event_sub_status_label_ {{ column_suffix }},
evt.created_at AS last_event_date_ {{ column_suffix }}
FROM {{ establishment_table }} AS e
LEFT JOIN {{ event_table }} AS evt
ON evt.establishment_id = e.id AND evt.row_num = 1
)
{ % endmacro % }
