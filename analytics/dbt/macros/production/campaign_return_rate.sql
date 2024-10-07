{% macro process_return_rate_for_campagins(n_month) %}
    COUNT(DISTINCT CASE
        WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND e.event_status_label = 'Suivi terminé'
        AND (next_pc.next_sent_at IS NULL OR e.created_at < next_pc.next_sent_at)
        THEN pch.housing_id
    END) AS returned_count_{{ n_month }}_months,

    (COUNT(DISTINCT CASE
        WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND e.event_status_label = 'Suivi terminé'
        AND (next_pc.next_sent_at IS NULL OR e.created_at < next_pc.next_sent_at)
        THEN pch.housing_id
    END) / COUNT(DISTINCT h.id) ) * 100 AS return_rate_{{ n_month }}
{% endmacro %}
