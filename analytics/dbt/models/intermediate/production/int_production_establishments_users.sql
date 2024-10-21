SELECT 
    u.establishment_id,
    STRING_AGG(u.id) user_ids,
    STRING_AGG(u.email) user_emails,
    COUNT(*) user_number,
    MAX(activated_at) last_activated_at,
    MIN(activated_at) first_activated_at,
    MAX(last_authenticated_at) last_authenticated_at,
    CASE 
        WHEN MAX(last_authenticated_at) > NOW() - INTERVAL '30 days' THEN TRUE
        ELSE FALSE
    END AS connected_last_30_days,
    CASE 
        WHEN MAX(last_authenticated_at) > NOW() - INTERVAL '60 days' THEN TRUE
        ELSE FALSE
    END AS connected_last_60_days,
    CASE 
        WHEN MAX(last_authenticated_at) > NOW() - INTERVAL '90 days' THEN TRUE
        ELSE FALSE
    END AS connected_last_90_days
FROM {{ ref('int_production_users')}} u
GROUP BY u.establishment_id
