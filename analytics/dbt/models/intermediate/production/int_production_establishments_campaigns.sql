SELECT 
    pc.establishment_id,
    TRUE as has_campaigns,
    COUNT(DISTINCT pc.id) as total_campaigns,
    SUM(CASE WHEN pc.sent_at IS NOT NULL THEN 1 END) as total_sent_campaigns,
    SUM(CASE WHEN pc.exported_at IS NOT NULL THEN 1 END) as total_exported_campaigns,
    MAX(pc.created_at) as last_campaign_created,
    MIN(pc.created_at) as first_campaign_created,
    MAX(pc.is_creation_gt_30_days) as is_creation_gt_30_days,
    MAX(pc.is_creation_lt_30_days) as is_creation_lt_30_days

FROM {{ ref('int_production_campaigns')}} pc
GROUP BY pc.establishment_id
