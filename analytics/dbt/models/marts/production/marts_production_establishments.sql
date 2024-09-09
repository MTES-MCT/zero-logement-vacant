
SELECT pe.*, peu.*
FROM {{ ref('int_production_establishments') }} pe 
LEFT JOIN {{ ref('int_production_establishments_users')}} peu ON pe.id = peu.establishment_id
