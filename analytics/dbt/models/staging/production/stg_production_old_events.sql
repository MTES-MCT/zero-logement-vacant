SELECT * FROM {{ source ('duckdb_production_raw', 'old_events') }}
