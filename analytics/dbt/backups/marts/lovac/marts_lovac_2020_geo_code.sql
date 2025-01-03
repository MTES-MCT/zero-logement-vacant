WITH fil_geo_code AS 
(
    SELECT 
        geo_code,
        COUNT(DISTINCT local_id) AS count_local_id
    FROM {{ ref('int_lovac_fil_2020') }}
    GROUP BY geo_code
), 
ex_geo_code AS 
(
    SELECT 
        geo_code,
        COUNT(DISTINCT local_id) AS count_local_id
    FROM {{ ref('int_lovac_ex_2020') }}
    GROUP BY geo_code
)
SELECT 
    fil_geo_code.geo_code,
    fil_geo_code.count_local_id AS count_fil,
    ex_geo_code.count_local_id AS count_ex
FROM fil_geo_code
LEFT JOIN ex_geo_code
    ON fil_geo_code.geo_code = ex_geo_code.geo_code
ORDER BY fil_geo_code.geo_code ASC
