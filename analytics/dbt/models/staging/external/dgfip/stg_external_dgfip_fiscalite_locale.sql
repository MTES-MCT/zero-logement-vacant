-- Staging model for DGFIP Fiscalité locale des particuliers
-- Source: https://www.data.gouv.fr/api/1/datasets/r/f48d0fcc-f732-445d-ba2d-886ec4952bce
-- Contains local taxation rates by commune (TFNB, TFB, TH, TEOM)

WITH source AS (
    SELECT * FROM {{ source('external_dgfip', 'dgfip_fiscalite_locale_particuliers_raw') }}
),

renamed AS (
    SELECT
        -- Primary key - Code commune INSEE (full 5-digit code)
        CAST("INSEE COM" AS VARCHAR) AS geo_code,
        
        -- Commune identification
        LIBCOM AS commune_name,
        CAST(COM AS VARCHAR) AS commune_code_short,
        
        -- Geographic hierarchy
        CAST(DEP AS VARCHAR) AS department_code,
        LIBDEP AS department_name,
        CAST(REG AS VARCHAR) AS region_code,
        LIBREG AS region_name,
        
        -- EPCI information
        CAST(SIREPCI AS VARCHAR) AS epci_siren,
        Q03 AS epci_name,
        OPTEPCI AS epci_regime_fiscal, -- FPU, FPA, FPZ
        
        -- Population weight
        TRY_CAST(MPOID AS DOUBLE) AS population_ponderee,
        
        -- =====================================================
        -- TAXE FONCIÈRE SUR LES PROPRIÉTÉS NON BÂTIES (TFNB)
        -- =====================================================
        TRY_CAST(B12VOTE AS DOUBLE) AS tfnb_taux_commune,
        TRY_CAST(B22 AS DOUBLE) AS tfnb_taux_syndicat,
        TRY_CAST(B32VOTE AS DOUBLE) AS tfnb_taux_epci,
        TRY_CAST(B12TAFNB AS DOUBLE) AS tfnb_taux_additionnel_commune,
        TRY_CAST(B32TAFNB AS DOUBLE) AS tfnb_taux_additionnel_epci,
        TRY_CAST(B32MGPTAFNB AS DOUBLE) AS tfnb_taux_additionnel_mgp,
        TRY_CAST(B52 AS DOUBLE) AS tfnb_taux_departement,
        TRY_CAST(B52A AS DOUBLE) AS tfnb_taux_region,
        TRY_CAST("B52gGEMAPI" AS DOUBLE) AS tfnb_taux_gemapi,
        TRY_CAST(Taux_Global_TFNB AS DOUBLE) AS tfnb_taux_global,
        
        -- =====================================================
        -- TAXE FONCIÈRE SUR LES PROPRIÉTÉS BÂTIES (TFB)
        -- =====================================================
        TRY_CAST(E12VOTE AS DOUBLE) AS tfb_taux_commune,
        TRY_CAST(E22 AS DOUBLE) AS tfb_taux_syndicat,
        TRY_CAST(E32VOTE AS DOUBLE) AS tfb_taux_epci,
        TRY_CAST(E52 AS DOUBLE) AS tfb_taux_departement,
        TRY_CAST(E52A AS DOUBLE) AS tfb_taux_region,
        TRY_CAST(E52TASA AS DOUBLE) AS tfb_taux_tasa,
        TRY_CAST("E52gGEMAPI" AS DOUBLE) AS tfb_taux_gemapi,
        TRY_CAST(Taux_Global_TFB AS DOUBLE) AS tfb_taux_global,
        
        -- =====================================================
        -- TAXE D'ENLÈVEMENT DES ORDURES MÉNAGÈRES (TEOM)
        -- =====================================================
        TRY_CAST(Taux_Plein_TEOM AS DOUBLE) AS teom_taux,
        
        -- =====================================================
        -- TAXE D'HABITATION (TH) - Supprimée pour résidences principales
        -- =====================================================
        TRY_CAST(H12VOTE AS DOUBLE) AS th_taux_commune,
        TRY_CAST(H22 AS DOUBLE) AS th_taux_syndicat,
        TRY_CAST(H32VOTE AS DOUBLE) AS th_taux_epci,
        TRY_CAST(H52 AS DOUBLE) AS th_taux_departement,
        TRY_CAST(H52A AS DOUBLE) AS th_taux_region,
        TRY_CAST("H52gGEMAPI" AS DOUBLE) AS th_taux_gemapi,
        TRY_CAST(Taux_Global_TH AS DOUBLE) AS th_taux_global,
        
        -- TH surcharge for second homes (résidences secondaires)
        IND_MAJOTHRS AS th_surtaxe_indicateur, -- OUI/NON
        TRY_CAST(THSURTAXRSTAU AS DOUBLE) AS th_surtaxe_residences_secondaires_pct,
        
        -- Year of reference
        TRY_CAST(EXERCICE AS INTEGER) AS annee_reference,
        
        -- Derived: Total fiscal pressure indicator
        TRY_CAST(Taux_Global_TFB AS DOUBLE) + COALESCE(TRY_CAST(Taux_Plein_TEOM AS DOUBLE), 0) AS pression_fiscale_tfb_teom

    FROM source
    WHERE "INSEE COM" IS NOT NULL
)

SELECT * FROM renamed

