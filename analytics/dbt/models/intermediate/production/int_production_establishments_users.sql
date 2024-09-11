SELECT 
    u.establishment_id,
    STRING_AGG(u.id) user_ids,
    STRING_AGG(u.email) user_emails,
    COUNT(*) user_number,
    MAX(activated_at) last_activated_at,
    MIN(activated_at) first_activated_at,
    MAX(last_authenticated_at) last_authenticated_at
FROM {{ ref('int_production_users')}} u
GROUP BY u.establishment_id
