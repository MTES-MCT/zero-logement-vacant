SELECT 
COM as geo_code,
TYPECOM as type_com,
TNCC,
NCC,
NCCENR,
LIBELLE as commune_name,
DATE_DEBUT as date_debut,
DATE_FIN as date_fin
FROM {{ source('external_insee', 'insee_cog_2025_raw') }}
