SELECT * FROM {{ source ('duckdb_production_raw', 'groups_housing') }}
