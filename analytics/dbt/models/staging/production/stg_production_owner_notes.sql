SELECT * FROM {{ source ('duckdb_production_raw', 'owner_notes') }}
