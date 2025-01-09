SELECT
    CODGEO AS GEO_CODE,
    UU_CODE,
    UU_NAME,
    EPCI_CODE,
    EPCI_NAME
FROM {{ ref ('table_appartenance_geo_communes_2024') }}
