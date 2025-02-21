SELECT 
*
FROM {{ source ('duckdb_raw', 'regions') }}