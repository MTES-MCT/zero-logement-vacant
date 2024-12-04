WITH base AS (
    SELECT 
        pc.id as id,
        e.created_at as global_date,
        CASE WHEN category = 'Followup' then e.created_at ELSE NULL END AS followup_date,
        CASE WHEN category = 'Ownership' then e.created_at ELSE NULL END AS ownership_date,
    FROM {{ ref('int_production_campaigns') }} pc
    JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
     JOIN {{ ref('int_production_events') }} e ON e.housing_id = pch.housing_id 
        AND e.created_at > pc.sent_at 
        AND e.user_source = 'user'
        AND e.created_at < (pc.sent_at  + INTERVAL '36 months')
    WHERE
        pc.sent_at IS NOT NULL
        
)
SELECT 
    id,
    MIN(global_date) AS first_event_global_date,
    MAX(global_date) AS last_event_global_date,
    MIN(followup_date) AS first_event_followup_date,
    MAX(followup_date) AS last_event_followup_date,
    MIN(ownership_date) AS first_event_ownership_date,
    MAX(ownership_date) AS last_event_ownership_date
FROM base
    GROUP BY id
