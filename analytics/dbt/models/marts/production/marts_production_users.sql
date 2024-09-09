
SELECT pu.*, pe.*
FROM {{ ref('int_production_users') }} pu
LEFT JOIN  {{ ref('int_production_establishments') }} pe ON pe.id = pu.establishment_id
