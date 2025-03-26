SELECT
    ff_idcom AS geo_code, *
FROM {{ source ('duckdb_raw', 'raw_ff_2024') }}
