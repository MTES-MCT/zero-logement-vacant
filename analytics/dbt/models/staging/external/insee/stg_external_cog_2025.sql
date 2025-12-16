SELECT 
* 
FROM {{ source('external_insee', 'cog_2025_raw') }}
