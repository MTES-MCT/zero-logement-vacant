
SELECT 
    pc.*, 
    pcs.*
FROM {{ref('int_production_campaigns')}} pc 
JOIN {{ ref('int_production_campaigns_stats') }} pcs ON pcs.id = pc.id