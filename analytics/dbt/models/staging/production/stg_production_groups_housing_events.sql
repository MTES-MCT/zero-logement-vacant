SELECT * FROM {{ source ('duckdb_production_raw', 'group_housing_events') }}
