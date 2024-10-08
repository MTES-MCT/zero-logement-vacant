WITH ranked_fusions AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY geo_code_destination ORDER BY year DESC) as row_num
    FROM {{ ref('stg_common_fusions') }}
)
SELECT *, TRUE as has_fusion
FROM ranked_fusions
WHERE row_num = 1