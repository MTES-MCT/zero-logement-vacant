SELECT DISTINCT
    ON(geo_code) *
FROM {{ ref ('stg_common_cities') }}
