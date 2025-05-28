SELECT 
*
FROM {{ ref ('stg_ff_owners_2024') }}
WHERE entity NOT IN (1, 2, 3, 4, 5, 6, 9) OR entity IS NULL

