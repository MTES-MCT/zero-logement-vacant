SELECT * FROM {{ source ('duckdb_production_raw', 'notes') }}
