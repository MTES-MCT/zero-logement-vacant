-- Staging model for DGFIP Délibérations Fiscalité Locale
-- Source: https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/7906b3eb-c42f-41f7-b984-de5e00ba62a6.parquet

WITH source AS (
    SELECT * FROM {{ source('external_dgfip', 'dgfip_deliberation_fiscalite_locale_communes_raw') }}
),

renamed AS (
    SELECT
        CAST("DEPCOM" AS VARCHAR) AS geo_code,
        CAST("DEP" AS VARCHAR) AS department_code,
        "LIBCOM" AS commune_name,
        "THLVDAT" AS date_thlv,
        "THSURTAXRSDAT" AS date_surtaxe_th_rs,
        TRY_CAST("THSURTAXRSTAU" AS DOUBLE) AS taux_surtaxe_th_rs
    FROM source
)

SELECT * FROM renamed
