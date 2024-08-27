SELECT
    u.*
FROM {{ ref('stg_production_users') }} u
WHERE u.deleted_at IS NULL

 