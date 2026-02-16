-- Staging model for DGFIP Liste Communes TLV
-- Source: https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/efe71da1-15f8-4526-bcb8-5b9a9419c58c.parquet

WITH source AS (
    SELECT * FROM {{ source('external_dgfip', 'dgfip_liste_communes_tlv1_tlv2_raw') }}
),

renamed AS (
    SELECT
        CAST("CODGEO25" AS VARCHAR) AS geo_code,
        CAST("DEP" AS VARCHAR) AS department_code,
        "LIBGEO" AS commune_name,
        CAST("Code EPCI" AS VARCHAR) AS epci_code,
        "Libellé EPCI" AS epci_name,
        "Zonage TLV 2013" AS tlv_2013,
        "Zonage TLV 2023" AS tlv_2023,
        "Zonage TLV post décret 22/12/2025" AS tlv_2026
    FROM source
)

SELECT * FROM renamed
