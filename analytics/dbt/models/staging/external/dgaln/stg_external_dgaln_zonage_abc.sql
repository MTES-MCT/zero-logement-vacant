WITH source AS (
    SELECT * FROM {{ source('external_dgaln', 'dgaln_zonage_abc_raw') }}
),

renamed AS (
    SELECT
        CAST(CODGEO AS VARCHAR) AS geo_code,
        LPAD(CAST(DEP AS VARCHAR), 2, '0') AS department_code,
        CAST(LIBGEO AS VARCHAR) AS commune_name,
        CAST("Zonage en vigueur depuis le 5 septembre 2025" AS VARCHAR) AS zonage_en_vigueur,
        CAST("Reclassement 5 septembre 2025" AS VARCHAR) AS reclassement,
    FROM source
    WHERE CODGEO IS NOT NULL
)

SELECT * FROM renamed

