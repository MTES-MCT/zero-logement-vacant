{% macro process_return_rate_with_next_campaign(n_month) %}
    MAX(CASE
        WHEN next_campaigns.next_sent_at IS NOT NULL AND next_campaigns.next_sent_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
        THEN 1
        ELSE 0
    END) AS has_next_campaign_in_{{ n_month }}_months,
    
    COUNT(DISTINCT CASE
        WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND (next_campaigns.next_sent_at IS NULL OR e.created_at < next_campaigns.next_sent_at)
        AND (e.status_changed IS TRUE OR e.occupancy_changed IS TRUE)
        AND e.category = 'Followup'
        THEN pch.housing_id
    END) AS return_count_{{ n_month }}_months_before_next_campaign,

    (COUNT(DISTINCT CASE
        WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
        AND (next_campaigns.next_sent_at IS NULL OR e.created_at < next_campaigns.next_sent_at)
        AND (e.status_changed IS TRUE OR e.occupancy_changed IS TRUE)
        AND e.category = 'Followup'
        THEN pch.housing_id
    END) * 100.0 / NULLIF(MAX(cc.count_housing), 0)) AS return_rate_{{ n_month }}_months_before_next_campaign
{% endmacro %}
