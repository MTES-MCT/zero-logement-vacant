SELECT ph.*, c.city_code
FROM {{ ref('stg_production_housing') }} ph 
JOIN {{ ref('int_common_cities_mapping') }} c ON ph.geo_code = c.geo_code