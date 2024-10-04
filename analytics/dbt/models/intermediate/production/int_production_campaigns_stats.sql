SELECT 
    pc.id,
    COUNT(DISTINCT h.id) AS housing_number,
    {{ process_return_rate_for_campagins(3) }},
    {{ process_return_rate_for_campagins(6) }},
    {{ process_return_rate_for_campagins(9) }},
    {{ process_return_rate_for_campagins(24) }},
    ARRAY_AGG(DISTINCT pch.housing_id) as housing_ids,
    ARRAY_AGG(DISTINCT housing_geo_code) as housing_geo_codes,
    COUNT(DISTINCT housing_geo_code) as housing_geo_code_number
FROM {{ ref('int_production_campaigns') }} pc 
JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
JOIN {{ ref('int_production_housing') }} h ON pch.housing_id = h.id
LEFT JOIN {{ ref('int_production_events') }} e ON e.housing_id = h.id
-- Using a window function to find the next campaign sent_at date
LEFT JOIN (
    SELECT
        id,
        LEAD(sent_at) OVER (ORDER BY sent_at) AS next_sent_at
    FROM {{ ref('int_production_campaigns') }}
) next_pc ON next_pc.id = pc.id
WHERE next_pc.next_sent_at IS NULL OR e.created_at < next_pc.next_sent_at
GROUP BY pc.id
ORDER BY pc.id
