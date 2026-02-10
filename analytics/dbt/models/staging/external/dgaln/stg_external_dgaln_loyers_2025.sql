-- Staging model for DGALN Loyers 2025 (Appartements + Maisons)
-- Sources: 
-- Apparts: https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/55b34088-0964-415f-9df7-d87dd98a09be.parquet
-- Maisons: https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/129f764d-b613-44e4-952c-5ff50a8c9b73.parquet

WITH apparts AS (
    SELECT * FROM {{ source('external_dgaln', 'dgaln_loyers_appart_2025_raw') }}
),

maisons AS (
    SELECT * FROM {{ source('external_dgaln', 'dgaln_loyers_maisons_2025_raw') }}
),

joined AS (
    SELECT
        CAST(COALESCE(a."INSEE_C", m."INSEE_C") AS VARCHAR) AS geo_code,
        
        -- Appartements
        a."loypredm2" AS loyer_predit_m2_appartements,
        a."lwr.IPm2" AS loyer_intervalle_bas_m2_appartements,
        a."upr.IPm2" AS loyer_intervalle_haut_m2_appartements,
        a."TYPPRED" AS type_prediction_appartements,
        a."nbobs_com" AS nb_observations_commune_appartements,
        a."nbobs_mail" AS nb_observations_maille_appartements,
        a."R2_adj" AS r2_adjusted_appartements,
        
        -- Maisons
        m."loypredm2" AS loyer_predit_m2_maisons,
        m."lwr.IPm2" AS loyer_intervalle_bas_m2_maisons,
        m."upr.IPm2" AS loyer_intervalle_haut_m2_maisons,
        m."TYPPRED" AS type_prediction_maisons,
        m."nbobs_com" AS nb_observations_commune_maisons,
        m."nbobs_mail" AS nb_observations_maille_maisons,
        m."R2_adj" AS r2_adjusted_maisons

    FROM apparts a
    FULL OUTER JOIN maisons m ON a."INSEE_C" = m."INSEE_C"
)

SELECT * FROM joined
