
SELECT
    housing_id,
    MIN(pc.created_at) AS first_campaign_created,
    MAX(pc.created_at) AS last_campaign_created,
    MIN(pc.sent_at) AS first_campaign_sent,
    MAX(pc.sent_at) AS last_campaign_sent,
    SUM(pc.is_validated) AS total_validated,
    SUM(pc.is_confirmed) AS total_confirmed,
    SUM(pc.is_sent) AS total_sent
FROM {{ ref ('stg_production_campaigns_housing') }} as pch
JOIN {{ ref ('int_production_campaigns') }} as pc ON pch.campaign_id = pc.id
GROUP BY housing_id
