
SELECT
    campaign_id,
    ARRAY_AGG(housing_id) as housing_ids,
    COUNT(*) as housing_number, 
    ARRAY_AGG(housing_geo_code) as housing_geo_codes,
    COUNT(DISTINCT housing_geo_code) as housing_geo_code_number
FROM {{ ref('stg_production_campaigns_housing') }} as c
GROUP BY campaign_id 