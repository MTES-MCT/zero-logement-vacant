
SELECT pe.*, peu.*, pec.*, peg.*, pep.*
FROM {{ ref('int_production_establishments') }} pe 
LEFT JOIN {{ ref('int_production_establishments_users')}} peu ON pe.id = peu.establishment_id
LEFT JOIN {{ ref('int_production_establishments_campaigns')}} pec ON pe.id = pec.establishment_id
LEFT JOIN {{ ref('int_production_establishments_groups')}} peg ON pe.id = peg.establishment_id
LEFT JOIN {{ ref('int_production_establishments_perimeters')}} pep ON pe.id = pep.establishment_id
