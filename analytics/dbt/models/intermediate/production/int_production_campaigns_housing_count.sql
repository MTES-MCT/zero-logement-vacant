SELECT 
    pc.id as campaign_id, 
    COUNT(DISTINCT pch.housing_id) as count_housing
FROM {{ ref('int_production_campaigns') }} pc
JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
GROUP BY pc.id