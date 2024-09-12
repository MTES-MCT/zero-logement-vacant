SELECT 
    pc.establishment_id,
    COUNT(DISTINCT pc.id) as total_campaigns,
    SUM(CASE WHEN pc.sent_at IS NOT NULL THEN 1 END) as total_sent_campaigns,
    MAX(pc.created_at) as last_campaign_created,
    MIN(pc.created_at) as first_campaign_created,
FROM {{ ref('int_production_campaigns')}} pc
GROUP BY pc.establishment_id
