with source as (
    SELECT * FROM {{ source('duckdb_raw', 'raw_lovac_2021') }}
),
{{ handle_lovac_different_years() }}