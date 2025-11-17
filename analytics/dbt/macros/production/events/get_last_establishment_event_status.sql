{% macro get_last_establishment_event_status (user_source,
event_name,
all_users = false) %}
(
SELECT
u.establishment_id,
events.new_status AS status,
events.event_status_label AS status_label,
events.new_occupancy AS occupancy,
events.new_sub_status,
events.created_at,
ROW_NUMBER () OVER (PARTITION BY u.establishment_id ORDER BY events.created_at DESC) AS row_num
FROM {{ ref ('int_production_events') }} AS events
LEFT JOIN {{ ref ('int_production_users') }} AS u ON events.created_by = u.id
WHERE
1 = 1
AND events.type IN('housing:status-updated', 'housing:occupancy-updated')
{% if event_name == 'suivi' %}
AND events.status_changed = TRUE
{% elif event_name == 'occupation' %}
AND events.occupancy_changed = TRUE
{% else %}
{% endif %}
{% if not all_users %}
AND events.user_source = '{{ user_source }}'
{% endif %}
)
{% endmacro %}
