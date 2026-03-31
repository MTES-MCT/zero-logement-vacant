SELECT * FROM {{ source ('duckdb_production_raw', 'housing_document_events') }}
