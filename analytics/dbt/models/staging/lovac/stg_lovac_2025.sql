with source as (
SELECT * FROM {{ source ('duckdb_raw', 'raw_lovac_2025') }}
),
{{ handle_lovac_different_years(new_version=True) }}
