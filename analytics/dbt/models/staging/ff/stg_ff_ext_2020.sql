SELECT 
ff_idcom as geo_code, *
FROM {{ source('duckdb_raw', 'raw_ff_2023') }}