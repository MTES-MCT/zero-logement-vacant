WITH source AS (
    SELECT * FROM {{ source('external_dgaln', 'dgaln_carte_loyers_2023_raw') }}
),

renamed AS (
    SELECT
        -- Zone identifier
        id_zone,
        
        -- Primary key - Code commune INSEE
        CAST(INSEE_C AS VARCHAR) AS geo_code,
        
        -- Commune name
        LIBGEO AS commune_name,
        
        -- EPCI code
        CAST(EPCI AS VARCHAR) AS epci_code,
        
        -- Department code
        CAST(DEP AS VARCHAR) AS department_code,
        
        -- Region code
        CAST(REG AS VARCHAR) AS region_code,
        
        -- Predicted rent per m² (loyer prédit au m²)
        TRY_CAST(loypredm2 AS DOUBLE) AS loyer_predit_m2,
        
        -- Lower bound of prediction interval
        TRY_CAST("lwr.IPm2" AS DOUBLE) AS loyer_intervalle_bas_m2,
        
        -- Upper bound of prediction interval
        TRY_CAST("upr.IPm2" AS DOUBLE) AS loyer_intervalle_haut_m2,
        
        -- Prediction type (commune or maille)
        TYPPRED AS type_prediction,
        
        -- Number of observations at commune level
        TRY_CAST(nbobs_com AS INTEGER) AS nb_observations_commune,
        
        -- Number of observations at maille level
        TRY_CAST(nbobs_mail AS INTEGER) AS nb_observations_maille,
        
        -- Adjusted R² of the model
        TRY_CAST(R2_adj AS DOUBLE) AS r2_adjusted,
        
        -- Derived: Rent level category based on predicted rent
        CASE 
            WHEN TRY_CAST(loypredm2 AS DOUBLE) >= 15 THEN 'Très élevé'
            WHEN TRY_CAST(loypredm2 AS DOUBLE) >= 12 THEN 'Élevé'
            WHEN TRY_CAST(loypredm2 AS DOUBLE) >= 9 THEN 'Moyen'
            WHEN TRY_CAST(loypredm2 AS DOUBLE) >= 6 THEN 'Modéré'
            ELSE 'Faible'
        END AS niveau_loyer,
        
        -- Derived: Prediction confidence (based on interval width)
        CASE 
            WHEN TRY_CAST("upr.IPm2" AS DOUBLE) - TRY_CAST("lwr.IPm2" AS DOUBLE) < 2 THEN 'Haute'
            WHEN TRY_CAST("upr.IPm2" AS DOUBLE) - TRY_CAST("lwr.IPm2" AS DOUBLE) < 4 THEN 'Moyenne'
            ELSE 'Faible'
        END AS confiance_prediction

    FROM source
    WHERE INSEE_C IS NOT NULL
)

SELECT * FROM renamed

