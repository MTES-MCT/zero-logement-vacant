SELECT 
COM as geo_code,
TNC as commune_name,
NCC as commune_name,
NCCENR,
LIBELLE as commune_name,
DATE_DEBUT,
DATE_FIN
FROM {{ source('external_insee', 'cog_2025_raw') }}
