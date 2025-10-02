{% macro get_last_event_status (user_source, event_name, all_users = false) %}
(
SELECT
events.housing_id,
CASE  
  {% if event_name == 'occupation' %}
  WHEN events.occupancy_changed = TRUE THEN CAST(events.new_occupancy AS VARCHAR)
  WHEN events.status_changed = TRUE THEN CAST(events.new_status AS VARCHAR)
  {% else %}
  WHEN events.status_changed = TRUE THEN CAST(events.new_status AS VARCHAR)
  WHEN events.occupancy_changed = TRUE THEN CAST(events.new_occupancy AS VARCHAR)
  {% endif %}
  ELSE NULL
END AS status,
CASE  
  {% if event_name == 'occupation' %}
  WHEN events.occupancy_changed = TRUE THEN CAST(events.new_occupancy AS VARCHAR)
  WHEN events.status_changed = TRUE THEN events.event_status_label
  {% else %}
  WHEN events.status_changed = TRUE THEN events.event_status_label
  WHEN events.occupancy_changed = TRUE THEN CAST(events.new_occupancy AS VARCHAR)
  {% endif %}
  ELSE NULL
END AS status_label,
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
