SELECT
    insee_code AS geo_code,
    SUM(CASE WHEN typeprogramme LIKE '%OPAH%' THEN 1 ELSE 0 END) AS opah,
    STRING_AGG(
        DISTINCT(CASE WHEN typeprogramme LIKE '%OPAH%' THEN typeprogramme END)
    ) AS type_opah,
    SUM(CASE WHEN typeprogramme LIKE '%PIG%' THEN 1 ELSE 0 END) AS pig
FROM {{ ref ('stg_common_opah') }}
GROUP BY geo_code
