WITH next_campaigns AS (
    SELECT
        pc.id AS campaign_id,
        pc.sent_at AS current_sent_at,
        pc.establishment_id,
        LEAD(pc.id) OVER (PARTITION BY pc.establishment_id ORDER BY pc.sent_at) AS next_campaign_id,
        LEAD(pc.sent_at) OVER (PARTITION BY pc.establishment_id ORDER BY pc.sent_at) AS next_sent_at
    FROM {{ ref('int_production_campaigns') }} pc
    WHERE pc.sent_at IS NOT NULL
),
next_campaign_check AS (
    SELECT 
        pc.id,
        MIN(pc.sent_at) AS campaign_sent_at,
        MAX(next_campaigns.next_sent_at) AS next_campaign_sent_at,
        MAX(next_campaigns.next_sent_at) - MIN(pc.sent_at) AS time_to_next_campaign,
        {{ process_return_rate_with_next_campaign(3) }},
        {{ process_return_rate_with_next_campaign(6) }},
        {{ process_return_rate_with_next_campaign(9) }},
        {{ process_return_rate_with_next_campaign(36) }}
    FROM {{ ref('int_production_campaigns') }} pc
    LEFT JOIN {{ref('int_production_campaigns_housing_count')}} cc ON cc.campaign_id = pc.id
    LEFT JOIN next_campaigns ON next_campaigns.campaign_id = pc.id
    JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
    JOIN {{ ref('int_production_events') }} e ON e.housing_id = pch.housing_id 
            AND e.created_at > pc.sent_at  
            AND e.user_source = 'user'
            AND e.created_at < (pc.sent_at  + INTERVAL '36 months')  
    WHERE pc.sent_at IS NOT NULL 
    GROUP BY pc.id
)
SELECT * FROM next_campaign_check