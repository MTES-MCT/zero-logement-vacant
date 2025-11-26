SELECT 
    n.*, 
    hn.housing_id,
    pon.owner_id,
    u.establishment_id, 
    u.user_type
FROM {{ ref ('stg_production_notes') }} n
LEFT JOIN {{ ref ('int_production_housing_notes') }} hn ON hn.note_id = n.id
LEFT JOIN {{ ref ('int_production_owner_notes') }} pon ON pon.note_id = n.id
LEFT JOIN {{ ref ('int_production_users') }} u ON n.created_by = u.id
WHERE n.deleted_at IS NULL
