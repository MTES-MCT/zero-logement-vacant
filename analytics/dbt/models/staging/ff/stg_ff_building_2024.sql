SELECT 
idbat as id ,
nlogh as housing_count,
rnb_id,
rnb_id_score,
geomrnb as rnb_location,
    *
FROM {{ source ('duckdb_raw', 'raw_ff_2024_buildings') }}