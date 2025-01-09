{% macro get_last_event_status (user_source, event_name, all_users = false) %}
(
SELECT
events.housing_id,
events.new_status AS status,
events.event_status_label AS status_label,
events.new_sub_status,
events.created_at,
ROW_NUMBER () OVER (PARTITION BY events.housing_id ORDER BY events.created_at DESC) AS row_num
FROM {{ ref ('int_production_events') }} AS events
WHERE
1 = 1
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
