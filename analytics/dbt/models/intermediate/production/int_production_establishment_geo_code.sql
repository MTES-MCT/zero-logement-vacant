{{
    config(
        materialized='view',
        unique_key='geo_code',
    )
}}

SELECT 
    pel.geo_code,
    SUM(CASE WHEN peu.user_ids IS NOT NULL THEN 1 ELSE 0 END) as user_number, 
    COUNT(*) as establishment_number, 
    MAX(pel.department_number) as department_number, 
    STRING_AGG(DISTINCT pel.establishment_id, ', ') as establishment_ids
FROM {{ ref('int_production_establishments_localities') }} pel
LEFT JOIN {{ ref('int_production_establishments_users')}}  peu ON pel.establishment_id = peu.establishment_id
GROUP BY geo_code