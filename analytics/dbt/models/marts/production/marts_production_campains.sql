
SELECT 
    pc.*, 
    pch.*
FROM {{ref('int_production_campaigns')}} pc 
JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id


