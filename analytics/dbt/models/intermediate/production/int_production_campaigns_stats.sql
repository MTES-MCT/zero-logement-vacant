
SELECT 
    pc.id,
    COUNT(DISTINCT h.id) AS housing_number,
    COUNT(DISTINCT CASE
        WHEN e.created_at <= (pc.sent_at + INTERVAL '2 months')
        AND e.event_status_label = 'Suivi terminé'
        THEN pch.housing_id
        END) AS returned_count,
    (returned_count  / housing_number) * 100 AS return_rate,
    ARRAY_AGG(DISTINCT pch.housing_id) as housing_ids,
    ARRAY_AGG(DISTINCT housing_geo_code) as housing_geo_codes,
    COUNT(DISTINCT housing_geo_code) as housing_geo_code_number
FROM {{ref('int_production_campaigns')}} pc 
JOIN {{ ref('int_production_campaigns_housing') }} pch ON pch.campaign_id = pc.id
JOIN
    {{ ref('int_production_housing')}} h ON pch.housing_id = h.id
LEFT JOIN
    {{ ref('int_production_events')}} e ON e.housing_id = h.id
GROUP BY
    pc.id
ORDER BY
    pc.id