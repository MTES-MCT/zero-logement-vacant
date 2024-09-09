SELECT
    c.id as campaign_id, 
    *, 
    CASE WHEN validated_at IS NOT NULL THEN 1 ELSE 0 END  AS is_validated,
    CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END AS is_confirmed,
    CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END AS is_sent
FROM {{ ref('stg_production_campaigns') }} as c 