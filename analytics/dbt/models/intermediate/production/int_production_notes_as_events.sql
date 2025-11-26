SELECT 
    id,
    created_at,
    created_by,
    housing_id,
    owner_id,
    establishment_id,
    'note' as category,
    coalesce(user_type, 'user') AS user_source, 
    content
FROM {{ ref ('int_production_notes') }} n