SELECT
    u.*,
    CASE
        WHEN
            u.email LIKE '%beta.gouv.fr' THEN 'zlv'
        ELSE 'user'
    END AS user_type
FROM {{ ref ('stg_production_users') }} u
WHERE u.deleted_at IS NULL
