SELECT geo_code, COUNT(*) as nombre_logements
FROM {{ ref('int_ff_ext_2020') }}
GROUP BY geo_code