{% macro process_return_rate_for_campagins(n_month, housing_number, inf=True) %}
    COUNT(DISTINCT CASE
        WHEN e.created_at {% if inf %} < {% else %} > {% endif %} (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND e.event_status_label = 'Suivi terminé'
        THEN pch.housing_id
        END) AS returned_count_{{ n_month }}_months,

    (COUNT(DISTINCT CASE
        WHEN e.created_at {% if inf %} < {% else %} > {% endif %} (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND e.event_status_label = 'Suivi terminé'
        THEN pch.housing_id
        END) / COUNT(DISTINCT h.id) ) * 100 AS return_rate_{{ n_month }},
{% endmacro %}
