{% macro get_last_event_status(user_source, check_occupancy=false, check_status=false) %}
(
    SELECT
        events.housing_id,
        events.new_status AS status,
        events.event_status_label AS status_label,
        events.new_occupancy AS new_occupancy,
        events.new_status_raw,
        events.old_status_raw,
        events.new_occupancy_raw,
        events.old_occupancy_raw,
        events.created_at,
        ROW_NUMBER() OVER (PARTITION BY events.housing_id ORDER BY events.created_at DESC) AS row_num
    FROM {{ ref('int_production_events') }} AS events
    WHERE
        1=1
        {% if check_status %}
            AND events.status_changed = TRUE
        {% endif %}
        {% if check_occupancy %}
            AND events.occupancy_changed = TRUE
        {% endif %}
        {% if user_source %}
            AND events.user_source = '{{ user_source }}'
        {% endif %}
)
{% endmacro %}