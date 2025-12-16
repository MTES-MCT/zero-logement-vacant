SELECT DISTINCT
    ON(geo_code) *,
    CAST(geo_code [1: 2] as VARCHAR) as department_code,
    NULL as region_code
FROM {{ ref ('stg_common_cities') }}
