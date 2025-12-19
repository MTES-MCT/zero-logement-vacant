-- Intermediate model: INSEE features consolidation
-- Combines density grid, census data, and geographic information per city

WITH densite AS (
    SELECT
        geo_code,
        commune_name,
        densite_grid,
        densite_label,
        densite_category,
        densite_grid_7,
        densite_label_7,
        densite_aav_grid,
        densite_aav_label,
        population_2022,
        pct_pop_urbain_dense,
        pct_pop_urbain_intermediaire,
        pct_pop_rural
    FROM {{ ref('stg_external_insee_grille_densite_communes') }}
),

-- Pivot census data to get population by year in wide format
recensement_pivot AS (
    SELECT
        geo_code,
        MAX(CASE WHEN year = 2019 THEN population END) AS population_2019,
        MAX(CASE WHEN year = 2020 THEN population END) AS population_2020,
        MAX(CASE WHEN year = 2021 THEN population END) AS population_2021,
        MAX(CASE WHEN year = 2022 THEN population END) AS population_2022_recensement
    FROM {{ ref('stg_external_insee_recensement_historique') }}
    GROUP BY geo_code
),

-- Calculate population growth rates
population_growth AS (
    SELECT
        geo_code,
        population_2019,
        population_2020,
        population_2021,
        population_2022_recensement,
        -- Growth rate 2019-2022
        CASE 
            WHEN population_2019 > 0 AND population_2022_recensement > 0 
            THEN ROUND((population_2022_recensement - population_2019) * 100.0 / population_2019, 2)
            ELSE NULL
        END AS population_growth_rate_2019_2022,
        -- Annual average growth rate
        CASE 
            WHEN population_2019 > 0 AND population_2022_recensement > 0 
            THEN ROUND(((population_2022_recensement - population_2019) / 3.0) * 100.0 / population_2019, 2)
            ELSE NULL
        END AS population_growth_rate_annual
    FROM recensement_pivot
)

SELECT
    d.geo_code,
    d.commune_name,
    
    -- Density information (3-level classification)
    d.densite_grid,
    d.densite_label,
    d.densite_category,
    
    -- Density information (7-level classification)
    d.densite_grid_7,
    d.densite_label_7,
    
    -- Density in AAV context
    d.densite_aav_grid,
    d.densite_aav_label,
    
    -- Population composition percentages
    d.pct_pop_urbain_dense,
    d.pct_pop_urbain_intermediaire,
    d.pct_pop_rural,
    
    -- Population data
    COALESCE(d.population_2022, pg.population_2022_recensement) AS population_2022,
    pg.population_2019,
    pg.population_2020,
    pg.population_2021,
    pg.population_growth_rate_2019_2022,
    pg.population_growth_rate_annual,
    
    -- Population decline indicator
    CASE 
        WHEN pg.population_growth_rate_2019_2022 < 0 THEN TRUE 
        ELSE FALSE 
    END AS is_population_declining

FROM densite d
LEFT JOIN population_growth pg ON d.geo_code = pg.geo_code

