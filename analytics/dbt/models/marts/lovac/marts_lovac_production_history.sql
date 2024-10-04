SELECT 
	local_id,
    file_years,
    geo_code
    FROM {{ ref('int_lovac_history_housing') }}
ORDER BY local_id ASC