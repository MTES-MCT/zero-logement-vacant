SELECT 
id,
housing_count,
rnb_id,
rnb_id_score
FROM {{ ref ('stg_ff_building_2024') }}
