-- Staging model for INSEE Grille de densité 2025 - Communes
-- Source: https://www.insee.fr/fr/statistiques/fichier/8571524/fichier_diffusion_2025.xlsx
-- Classification de la densité communale (3 niveaux et 7 niveaux)

WITH source AS (
    SELECT * FROM {{ source('external_insee', 'insee_grille_densite_2025_communes_raw') }}
),

renamed AS (
    SELECT
        -- Primary key - Code commune INSEE
        CAST(CODGEO AS VARCHAR) AS geo_code,
        
        -- Commune name
        LIBGEO AS commune_name,
        
        -- Density grid classification (3 levels)
        -- 1: Urbain dense
        -- 2: Urbain intermédiaire  
        -- 3: Rural
        TRY_CAST(DENS AS INTEGER) AS densite_grid,
        
        -- Density grid label (3 levels)
        LIBDENS AS densite_label,
        
        -- Population 2022
        TRY_CAST(PMUN22 AS BIGINT) AS population_2022,
        
        -- Population percentages by density type
        TRY_CAST(P1 AS DOUBLE) AS pct_pop_urbain_dense,
        TRY_CAST(P2 AS DOUBLE) AS pct_pop_urbain_intermediaire,
        TRY_CAST(P3 AS DOUBLE) AS pct_pop_rural,
        
        -- Density in urban area context (AAV)
        TRY_CAST(DENS_AAV AS INTEGER) AS densite_aav_grid,
        
        -- Density label in AAV context
        LIBDENS_AAV AS densite_aav_label,
        
        -- Density grid classification (7 levels)
        -- 1: Grands centres urbains
        -- 2: Centres urbains intermédiaires
        -- 3: Petites villes
        -- 4: Ceintures urbaines
        -- 5: Bourgs ruraux
        -- 6: Rural à habitat dispersé
        -- 7: Rural à habitat très dispersé
        TRY_CAST(DENS7 AS INTEGER) AS densite_grid_7,
        
        -- Density label (7 levels)
        LIBDENS7 AS densite_label_7,
        
        -- Derived: Density category for analysis
        CASE 
            WHEN TRY_CAST(DENS AS INTEGER) = 1 THEN 'Urbain dense'
            WHEN TRY_CAST(DENS AS INTEGER) = 2 THEN 'Urbain intermédiaire'
            WHEN TRY_CAST(DENS AS INTEGER) = 3 THEN 'Rural'
            ELSE 'Inconnu'
        END AS densite_category

    FROM source
    WHERE CODGEO IS NOT NULL
)

SELECT * FROM renamed

