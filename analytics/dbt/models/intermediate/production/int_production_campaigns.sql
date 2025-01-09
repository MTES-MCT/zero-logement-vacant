SELECT
    c.id AS campaign_id,
    *,
    CASE WHEN validated_at IS NOT NULL THEN 1 ELSE 0 END AS is_validated,
    CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END AS is_confirmed,
    CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END AS is_sent,
    CASE
        WHEN sent_at IS NULL AND created_at <= NOW() - INTERVAL '30 days' THEN 1
        ELSE 0
    END AS is_creation_gt_30_days,
    CASE
        WHEN sent_at IS NULL AND created_at > NOW() - INTERVAL '30 days' THEN 1
        ELSE 0
    END AS is_creation_lt_30_days
FROM {{ ref ('stg_production_campaigns') }} as c
