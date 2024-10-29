{% macro select_last_event(housing_table, event_table, column_suffix) %}
(
    SELECT 
        h.id AS housing_id,
        evt.status AS last_event_status_{{ column_suffix }},
        evt.status_label AS last_event_status_label_{{ column_suffix }},
        evt.created_at AS last_event_date_{{ column_suffix }}
    FROM {{ housing_table }} AS h
    LEFT JOIN {{ event_table }} AS evt
        ON evt.housing_id = h.id AND evt.row_num = 1
)
{% endmacro %}
