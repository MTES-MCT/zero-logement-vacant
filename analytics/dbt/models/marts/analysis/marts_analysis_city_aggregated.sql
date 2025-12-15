{{
config (
    materialized = 'table',
    unique_key = 'geo_code',
)
}}

-- Marts model: City-level aggregated analysis
-- Aggregates housing vacancy exit rates with city features for territorial analysis

{% set years = range(2019, 2025) %}

WITH housing_stats AS (
    SELECT
        geo_code,
        
        -- Counts
        COUNT(*) AS total_housing_count,
        SUM(is_housing_out) AS housing_out_count,
        SUM(CASE WHEN is_housing_out = 0 THEN 1 ELSE 0 END) AS still_vacant_count,
        
        -- Exit rate
        ROUND(SUM(is_housing_out) * 100.0 / NULLIF(COUNT(*), 0), 2) AS exit_rate_pct,
        
        -- By housing type
        SUM(CASE WHEN housing_kind = 'maison' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_maisons,
        SUM(CASE WHEN housing_kind = 'appartement' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_appartements,
        SUM(CASE WHEN housing_kind = 'maison' THEN 1 ELSE 0 END) AS total_maisons,
        SUM(CASE WHEN housing_kind = 'appartement' THEN 1 ELSE 0 END) AS total_appartements,
        
        -- By vacancy duration
        SUM(CASE WHEN vacancy_duration_category = '0-2 ans' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_0_2_ans,
        SUM(CASE WHEN vacancy_duration_category = '3-5 ans' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_3_5_ans,
        SUM(CASE WHEN vacancy_duration_category = '6-10 ans' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_6_10_ans,
        SUM(CASE WHEN vacancy_duration_category = 'Plus de 10 ans' AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_plus_10_ans,
        
        -- By energy performance
        SUM(CASE WHEN is_energy_sieve = TRUE AND is_housing_out = 1 THEN 1 ELSE 0 END) AS housing_out_energy_sieve,
        SUM(CASE WHEN is_energy_sieve = TRUE THEN 1 ELSE 0 END) AS total_energy_sieve,
        
        -- Average characteristics
        AVG(living_area) AS avg_living_area,
        AVG(rooms_count) AS avg_rooms_count,
        AVG(years_in_vacancy) AS avg_years_in_vacancy,
        AVG(building_year) FILTER (WHERE building_year > 0) AS avg_building_year
        
    FROM {{ ref('marts_analysis_housing_out_features') }}
    GROUP BY geo_code
),

city_features AS (
    SELECT * FROM {{ ref('int_analysis_city_features') }}
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    cf.geo_code,
    cf.commune_name,
    
    -- =====================================================
    -- VACANCY STATISTICS
    -- =====================================================
    hs.total_housing_count,
    hs.housing_out_count,
    hs.still_vacant_count,
    hs.exit_rate_pct,
    
    -- Exit rates by type
    ROUND(hs.housing_out_maisons * 100.0 / NULLIF(hs.total_maisons, 0), 2) AS exit_rate_maisons_pct,
    ROUND(hs.housing_out_appartements * 100.0 / NULLIF(hs.total_appartements, 0), 2) AS exit_rate_appartements_pct,
    hs.total_maisons,
    hs.total_appartements,
    
    -- Exit rates by duration
    hs.housing_out_0_2_ans,
    hs.housing_out_3_5_ans,
    hs.housing_out_6_10_ans,
    hs.housing_out_plus_10_ans,
    
    -- Energy sieve impact
    hs.housing_out_energy_sieve,
    hs.total_energy_sieve,
    ROUND(hs.housing_out_energy_sieve * 100.0 / NULLIF(hs.total_energy_sieve, 0), 2) AS exit_rate_energy_sieve_pct,
    
    -- Average housing characteristics
    ROUND(hs.avg_living_area, 1) AS avg_living_area,
    ROUND(hs.avg_rooms_count, 1) AS avg_rooms_count,
    ROUND(hs.avg_years_in_vacancy, 1) AS avg_years_in_vacancy,
    ROUND(hs.avg_building_year, 0) AS avg_building_year,
    
    -- =====================================================
    -- CITY DEMOGRAPHICS (INSEE)
    -- =====================================================
    -- 3-level density classification
    cf.densite_grid,
    cf.densite_label,
    cf.densite_category,
    
    -- 7-level density classification
    cf.densite_grid_7,
    cf.densite_label_7,
    
    -- AAV density context
    cf.densite_aav_grid,
    cf.densite_aav_label,
    
    -- Population composition
    cf.pct_pop_urbain_dense,
    cf.pct_pop_urbain_intermediaire,
    cf.pct_pop_rural,
    
    -- Population data
    cf.population_2019,
    cf.population_2020,
    cf.population_2021,
    cf.population_2022,
    cf.population_growth_rate_2019_2022,
    cf.population_growth_rate_annual,
    cf.is_population_declining,
    
    -- =====================================================
    -- RENT DATA (DGALN)
    -- =====================================================
    cf.loyer_predit_m2,
    cf.loyer_intervalle_bas_m2,
    cf.loyer_intervalle_haut_m2,
    cf.loyer_type_prediction,
    cf.loyer_nb_obs_commune,
    cf.loyer_nb_obs_maille,
    cf.loyer_r2_adjusted,
    cf.niveau_loyer,
    cf.loyer_confiance_prediction,
    
    -- =====================================================
    -- REAL ESTATE PRICES (CEREMA PRIX VOLUMES)
    -- =====================================================
    {% for year in years %}
    -- Maisons
    cf.prix_median_m2_maisons_{{ year }},
    cf.prix_q25_m2_maisons_{{ year }},
    cf.prix_q75_m2_maisons_{{ year }},
    cf.valeur_fonciere_totale_maisons_{{ year }},
    cf.valeur_fonciere_q25_maisons_{{ year }},
    cf.valeur_fonciere_median_maisons_{{ year }},
    cf.valeur_fonciere_q75_maisons_{{ year }},
    cf.nb_mutations_maisons_{{ year }},
    
    -- Appartements
    cf.prix_median_m2_appartements_{{ year }},
    cf.prix_q25_m2_appartements_{{ year }},
    cf.prix_q75_m2_appartements_{{ year }},
    cf.valeur_fonciere_totale_appartements_{{ year }},
    cf.valeur_fonciere_q25_appartements_{{ year }},
    cf.valeur_fonciere_median_appartements_{{ year }},
    cf.valeur_fonciere_q75_appartements_{{ year }},
    cf.nb_mutations_appartements_{{ year }},
    {% endfor %}
    
    cf.evolution_prix_maisons_2019_2023_pct,
    cf.evolution_prix_appartements_2019_2023_pct,
    cf.total_mutations_maisons_2019_2024,
    cf.total_mutations_appartements_2019_2024,
    
    -- =====================================================
    -- MARKET TRANSACTIONS (DVG)
    -- =====================================================
    {% for year in years %}
    cf.dvg_nb_transactions_{{ year }},
    cf.dvg_prix_m2_moyen_{{ year }},
    {% endfor %}
    
    cf.dvg_total_transactions_2019_2024,
    cf.dvg_avg_annual_transactions,
    cf.dvg_evolution_prix_m2_2019_2023_pct,
    cf.dvg_marche_dynamisme,
    
    -- =====================================================
    -- LAND CONSUMPTION (CEREMA)
    -- =====================================================
    cf.conso_naf_total_ha,
    cf.conso_art_2009_2024_ha,
    cf.conso_activite_ha,
    cf.conso_habitat_ha,
    cf.conso_mixte_ha,
    cf.surface_commune_ha,
    cf.conso_population_2015,
    cf.conso_population_2021,
    cf.conso_menages_2015,
    cf.conso_menages_2021,
    cf.conso_emplois_2015,
    cf.conso_emplois_2021,
    cf.taux_artificialisation_pct,
    
    -- =====================================================
    -- LOCAL TAXATION (DGFIP)
    -- =====================================================
    cf.taux_tfb,
    cf.tfb_taux_commune,
    cf.taux_tfnb,
    cf.taux_th,
    cf.teom_taux,
    cf.th_surtaxe_indicateur,
    cf.th_surtaxe_residences_secondaires_pct,
    cf.pression_fiscale_tfb_teom,
    cf.epci_regime_fiscal,
    cf.fiscalite_annee_reference,
    
    -- =====================================================
    -- VACANCY INTENSITY METRICS
    -- =====================================================
    -- Housing vacancy rate (vs total ménages from conso data)
    CASE 
        WHEN cf.conso_menages_2021 > 0 
        THEN ROUND(hs.total_housing_count * 100.0 / cf.conso_menages_2021, 2)
        ELSE NULL
    END AS vacancy_rate_vs_menages_pct,
    
    -- Density of vacant housing (per population 2021)
    CASE 
        WHEN cf.conso_population_2021 > 0 
        THEN ROUND(hs.total_housing_count * 1000.0 / cf.conso_population_2021, 2)
        ELSE NULL
    END AS vacant_housing_per_1000_pop

FROM city_features cf
LEFT JOIN housing_stats hs ON cf.geo_code = hs.geo_code
WHERE hs.total_housing_count > 0
