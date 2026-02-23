SELECT 
COM as geo_code,
TNCC as tncc,
NCC as ncc,
NCCENR as nccenr,
LIBELLE as commune_name,
DATE_DEBUT as date_debut,
DATE_FIN as date_fin
FROM {{ source('external_insee', 'insee_cog_2024_raw') }}
