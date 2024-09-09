SELECT * FROM  {{ source('duckdb_production_raw', 'campaigns_housing')}}
