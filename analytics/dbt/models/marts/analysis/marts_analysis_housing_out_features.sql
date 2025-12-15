{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts model: Housing-level analysis with is_housing_out flag and city features
-- This table is designed for machine learning and statistical analysis to understand
-- what factors influence housing exiting vacancy

{% set years = range(2019, 2025) %}

WITH housing AS (
    SELECT * FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

city_features AS (
    SELECT * FROM {{ ref('int_analysis_city_features') }}
),

-- Get additional housing features from production
production_housing AS (
    SELECT
        h.id AS housing_id,
        h.geo_code,
        h.housing_kind AS housing_kind,
        h.rooms_count,
        h.living_area,
        h.building_year,
        h.vacancy_start_year,
        h.years_in_vacancy,
        h.vacancy_duration_category,
        h.mutation_date,
        h.energy_consumption_bdnb,
        h.cadastral_classification,
        h.uncomfortable,
        h.taxed,
        h.beneficiary_count,
        h.rental_value,
        c.tlv1 AS is_in_tlv1_territory,
        c.tlv2 AS is_in_tlv2_territory,
        c.action_coeur_de_ville,
        c.petite_ville_de_demain,
        c.village_davenir,
        c.opah,
        c.type_opah,
        c.ort_signed
    FROM {{ ref('int_production_housing') }} h
    LEFT JOIN {{ ref('marts_common_cities') }} c ON h.city_code = c.city_code
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    CAST(h.housing_id AS VARCHAR) AS housing_id,
    h.geo_code,    
    -- =====================================================
    -- TARGET VARIABLE
    -- =====================================================
    h.is_housing_out,
    h.vacancy_status_label,
    
    -- =====================================================
    -- HOUSING CHARACTERISTICS
    -- =====================================================
    ph.housing_kind,
    ph.rooms_count,
    ph.living_area,
    ph.building_year,
    ph.vacancy_start_year,
    ph.years_in_vacancy,
    ph.vacancy_duration_category,
    ph.mutation_date,
    ph.energy_consumption_bdnb,
    ph.cadastral_classification,
    ph.uncomfortable,
    ph.taxed,
    ph.beneficiary_count,
    ph.rental_value,
    
    -- Energy sieve indicator
    CASE 
        WHEN ph.energy_consumption_bdnb IN ('F', 'G') THEN TRUE 
        ELSE FALSE 
    END AS is_energy_sieve,
    
    -- Building age category
    CASE 
        WHEN ph.building_year IS NULL OR ph.building_year = 0 THEN 'Inconnu'
        WHEN ph.building_year < 1900 THEN 'Avant 1900'
        WHEN ph.building_year < 1950 THEN '1900-1949'
        WHEN ph.building_year < 1970 THEN '1950-1969'
        WHEN ph.building_year < 1990 THEN '1970-1989'
        WHEN ph.building_year < 2000 THEN '1990-1999'
        WHEN ph.building_year < 2010 THEN '2000-2009'
        ELSE '2010 et après'
    END AS building_age_category,
    
    -- Surface category
    CASE 
        WHEN ph.living_area IS NULL THEN 'Inconnu'
        WHEN ph.living_area < 30 THEN 'Moins de 30m²'
        WHEN ph.living_area < 50 THEN '30-49m²'
        WHEN ph.living_area < 80 THEN '50-79m²'
        WHEN ph.living_area < 100 THEN '80-99m²'
        WHEN ph.living_area < 150 THEN '100-149m²'
        ELSE '150m² et plus'
    END AS surface_category,
    
    -- =====================================================
    -- SPECIAL TERRITORIES
    -- =====================================================
    ph.is_in_tlv1_territory,
    ph.is_in_tlv2_territory,
    ph.action_coeur_de_ville,
    ph.petite_ville_de_demain,
    ph.village_davenir,
    ph.opah,
    ph.type_opah,
    ph.ort_signed,
    
    -- =====================================================
    -- CITY DEMOGRAPHICS (INSEE)
    -- =====================================================
    cf.commune_name,
    
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
    cf.fiscalite_annee_reference

FROM housing h
LEFT JOIN city_features cf ON h.geo_code = cf.geo_code
LEFT JOIN production_housing ph ON h.housing_id = ph.housing_id
