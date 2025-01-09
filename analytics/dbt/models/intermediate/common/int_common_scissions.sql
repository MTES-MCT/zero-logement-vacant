WITH ranked_scissions AS (
    SELECT
        *,
        ROW_NUMBER()
            OVER (PARTITION BY geo_code_destination ORDER BY year DESC)
            AS row_num
    FROM {{ ref ('stg_common_scissions') }}
)

SELECT *, TRUE AS has_scission
FROM ranked_scissions
WHERE row_num = 1
