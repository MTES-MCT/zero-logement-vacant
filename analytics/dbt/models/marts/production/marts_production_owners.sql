
SELECT 
    CAST(po.id AS VARCHAR) as owner_id,
    po.*
FROM {{ ref('int_production_owners') }} po