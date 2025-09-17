{% macro process_return_rate_without_next_campaign (n_month) %}
COUNT (DISTINCT CASE
WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
AND (e.status_changed IS TRUE OR e.occupancy_changed IS TRUE)
THEN pch.housing_id
END) AS return_count_{{ n_month }}_months,

(COUNT (DISTINCT CASE
WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
AND (e.status_changed IS TRUE OR e.occupancy_changed IS TRUE)
THEN pch.housing_id
END) * 100.0 / NULLIF (MAX (cc.count_housing),
0)) AS return_rate_{{ n_month }}_months
{% endmacro %}
