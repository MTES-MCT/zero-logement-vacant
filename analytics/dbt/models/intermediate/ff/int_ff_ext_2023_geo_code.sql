SELECT geo_code, COUNT(*) AS nombre_logements
FROM {{ ref ('int_ff_ext_2023') }}
GROUP BY geo_code
