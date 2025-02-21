SELECT 
*
FROM {{ source ('duckdb_raw', 'departements') }}