-- Staging model for INSEE Série historique du recensement
-- Combines all available years (2019-2022)
-- Source: https://www.insee.fr/fr/statistiques/fichier/2522602/fichier_pop_reference_6822.xlsx

WITH recensement_2022 AS (
    SELECT 
        CAST(COM AS VARCHAR) AS geo_code,
        NCC AS commune_name,
        TRY_CAST(PMUN22 AS BIGINT) AS population,
        2022 AS year
    FROM {{ source('external_insee', 'insee_recensement_historique_2022_raw') }}
    WHERE COM IS NOT NULL
    ),

recensement_2021 AS (
    SELECT 
        CAST(COM AS VARCHAR) AS geo_code,
        NCC AS commune_name,
        TRY_CAST(PMUN21 AS BIGINT) AS population,
        2021 AS year
    FROM {{ source('external_insee', 'insee_recensement_historique_2021_raw') }}
    WHERE COM IS NOT NULL
),

recensement_2020 AS (
    SELECT 
        CAST(COM AS VARCHAR) AS geo_code,
        NCC AS commune_name,
        TRY_CAST(PMUN20 AS BIGINT) AS population,
        2020 AS year
    FROM {{ source('external_insee', 'insee_recensement_historique_2020_raw') }}
    WHERE COM IS NOT NULL
),

recensement_2019 AS (
    SELECT 
        CAST(COM AS VARCHAR) AS geo_code,
        NCC AS commune_name,
        TRY_CAST(PMUN19 AS BIGINT) AS population,
        2019 AS year
    FROM {{ source('external_insee', 'insee_recensement_historique_2019_raw') }}
    WHERE COM IS NOT NULL
),

combined AS (
    SELECT * FROM recensement_2022
    UNION ALL
    SELECT * FROM recensement_2021
    UNION ALL
    SELECT * FROM recensement_2020
    UNION ALL
    SELECT * FROM recensement_2019
)

SELECT * FROM combined

