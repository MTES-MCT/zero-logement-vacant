SELECT
    u.establishment_id,
    STRING_AGG(u.id) AS user_ids,
    STRING_AGG(u.email) AS user_emails,
    COUNT(*) AS user_number,
    IF(COUNT(*) > 0, TRUE, FALSE) AS is_active,
    MAX(activated_at) AS last_activated_at,
    MIN(activated_at) AS first_activated_at,
    MAX(last_authenticated_at) AS last_authenticated_at,
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
FROM {{ ref ('int_production_users') }} u
GROUP BY u.establishment_id
