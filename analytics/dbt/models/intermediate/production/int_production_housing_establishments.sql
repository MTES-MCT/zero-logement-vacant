
SELECT
    ph.id as housing_id,
    STRING_AGG(DISTINCT pel.establishment_id, ' | ') as establishment_ids,
    ARRAY_AGG(DISTINCT pel.establishment_id) as establishment_ids_array, 
    CASE SUM(peu.user_number)
        WHEN 0 THEN FALSE
        ELSE TRUE
    END as has_users
FROM {{ ref('int_production_housing') }} as ph
LEFT JOIN {{ ref('int_production_establishments_localities') }} as pel ON pel.geo_code = ph.geo_code
LEFT JOIN {{ ref('int_production_establishments_users') }} as peu ON peu.establishment_id = pel.establishment_id
GROUP BY housing_id