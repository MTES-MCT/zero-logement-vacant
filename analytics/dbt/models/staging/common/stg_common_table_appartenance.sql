SELECT
CODGEO as geo_code,
UU_code,
UU_name,
EPCI_code,
EPCI_name
FROM {{ ref('table_appartenance_geo_communes_2024')}}
