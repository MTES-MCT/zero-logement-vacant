with source as (
SELECT * FROM {{ source ('duckdb_raw', 'cerema_lovac_2019_raw') }}
),
{{ handle_lovac_different_years(new_version=False) }}
