SELECT
    *
FROM {{ source ('duckdb_raw', 'communes') }}
