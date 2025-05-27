SELECT
    ff_idcom AS geo_code, *
FROM {{ source ('duckdb_raw', 'raw_lovac_ff_ext_2019') }}
