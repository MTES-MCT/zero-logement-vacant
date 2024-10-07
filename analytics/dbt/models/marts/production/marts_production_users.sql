
SELECT
    CAST(pu.id AS VARCHAR) user_id,
    CAST(pe.id AS VARCHAR) establishment_id, 
    pu.*,
    pe.*
FROM {{ ref('int_production_users') }} pu
LEFT JOIN  {{ ref('int_production_establishments') }} pe ON pe.id = pu.establishment_id
