SELECT 
        pc.id,
        {{ process_return_rate_without_next_campaign(3) }},
        {{ process_return_rate_without_next_campaign(6) }},
        {{ process_return_rate_without_next_campaign(9) }},
        {{ process_return_rate_without_next_campaign(36) }}
    FROM {{ ref('int_production_campaigns') }} pc
    LEFT JOIN {{ref('int_production_campaigns_housing_count')}} cc ON cc.campaign_id = pc.id 
    JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
    LEFT JOIN {{ ref('int_production_events') }} e ON e.housing_id = pch.housing_id
    WHERE e.created_at IS NULL OR (
        e.event_status_label = 'Suivi terminé' AND e.created_at > pc.sent_at AND e.user_source = 'user')
        AND pc.sent_at IS NOT NULL AND e.created_at < (pc.sent_at  + INTERVAL '36 months')
    GROUP BY pc.id