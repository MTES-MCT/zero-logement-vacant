SELECT
    ff_idcom AS geo_code, *
FROM {{ source ('duckdb_raw', 'cerema_lovac_ff_ext_2022_raw') }}
