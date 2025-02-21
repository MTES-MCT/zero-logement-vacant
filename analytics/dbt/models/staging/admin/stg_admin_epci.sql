SELECT 
*
FROM {{ source ('duckdb_raw', 'epci') }}