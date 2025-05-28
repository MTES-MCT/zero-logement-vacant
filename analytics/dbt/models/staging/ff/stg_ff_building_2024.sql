SELECT *
FROM {{ source ('duckdb_raw', 'raw_ff_2024_buildings') }}