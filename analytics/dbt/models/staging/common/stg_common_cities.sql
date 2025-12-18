SELECT 
*
FROM {{ ref ('stg_external_insee_cog_2025') }}
WHERE date_fin IS NULL