with source as (
SELECT * FROM {{ source ('duckdb_raw', 'cerema_lovac_2024_raw') }}
),
{{ handle_lovac_different_years(new_version=True) }}
