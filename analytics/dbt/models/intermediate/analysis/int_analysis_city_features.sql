-- Intermediate model: City features master join
-- Combines all city-level external data into a single table

{% set years = range(2019, 2025) %}

WITH insee AS (
    SELECT * FROM {{ ref('int_analysis_insee_features') }}
),

prix_volumes AS (
    SELECT * FROM {{ ref('int_analysis_prix_volumes_wide') }}
),

dvg AS (
    SELECT * FROM {{ ref('int_analysis_dvg_wide') }}
),

conso AS (
    SELECT * FROM {{ ref('stg_external_cerema_conso_espaces') }}
),

loyers AS (
    SELECT * FROM {{ ref('stg_external_dgaln_carte_loyers') }}
),

fiscalite AS (
    SELECT * FROM {{ ref('stg_external_dgfip_fiscalite_locale') }}
    WHERE annee_reference = 2024
),

zonage_abc AS (
    SELECT * FROM {{ ref('stg_external_dgaln_zonage_abc') }}
),

-- Get city mapping for arrondissements
city_mapping AS (
    SELECT
        geo_code,
        city_code
    FROM {{ ref('int_common_cities_mapping') }}
)

SELECT
    -- Use city_code as the main identifier (handles arrondissements)
    i.geo_code,
    i.commune_name,
    
    -- =====================================================
    -- INSEE DENSITY & DEMOGRAPHY
    -- =====================================================
    -- 3-level density classification
    i.densite_grid,
    i.densite_label,
    i.densite_category,
    
    -- 7-level density classification
    i.densite_grid_7,
    i.densite_label_7,
    
    -- AAV density context
    i.densite_aav_grid,
    i.densite_aav_label,
    
    -- Population composition
    i.pct_pop_urbain_dense,
    i.pct_pop_urbain_intermediaire,
    i.pct_pop_rural,
    
    -- Population data
    i.population_2019,
    i.population_2020,
    i.population_2021,
    i.population_2022,
    i.population_growth_rate_2019_2022,
    i.population_growth_rate_annual,
    i.is_population_declining,
    
    -- =====================================================
    -- DGALN LOYERS (from carte_loyers source)
    -- =====================================================
    l.loyer_predit_m2,
    l.loyer_intervalle_bas_m2,
    l.loyer_intervalle_haut_m2,
    l.type_prediction AS loyer_type_prediction,
    l.nb_observations_commune AS loyer_nb_obs_commune,
    l.nb_observations_maille AS loyer_nb_obs_maille,
    l.r2_adjusted AS loyer_r2_adjusted,
    l.niveau_loyer,
    l.confiance_prediction AS loyer_confiance_prediction,
    
    -- =====================================================
    -- DGALN ZONAGE ABC
    -- =====================================================
    z.zonage_en_vigueur,

    -- =====================================================
    -- CEREMA PRIX VOLUMES (selected years)
    -- =====================================================
    {% for year in years %}
    -- Maisons
    pv.prix_median_m2_maisons_{{ year }},
    pv.prix_q25_m2_maisons_{{ year }},
    pv.prix_q75_m2_maisons_{{ year }},
    pv.valeur_fonciere_totale_maisons_{{ year }},
    pv.valeur_fonciere_q25_maisons_{{ year }},
    pv.valeur_fonciere_median_maisons_{{ year }},
    pv.valeur_fonciere_q75_maisons_{{ year }},
    pv.nb_mutations_maisons_{{ year }},
    
    -- Appartements
    pv.prix_median_m2_appartements_{{ year }},
    pv.prix_q25_m2_appartements_{{ year }},
    pv.prix_q75_m2_appartements_{{ year }},
    pv.valeur_fonciere_totale_appartements_{{ year }},
    pv.valeur_fonciere_q25_appartements_{{ year }},
    pv.valeur_fonciere_median_appartements_{{ year }},
    pv.valeur_fonciere_q75_appartements_{{ year }},
    pv.nb_mutations_appartements_{{ year }},
    {% endfor %}
    
    pv.evolution_prix_maisons_2019_2023_pct,
    pv.evolution_prix_appartements_2019_2023_pct,
    pv.total_mutations_maisons_2019_2024,
    pv.total_mutations_appartements_2019_2024,
    
    -- =====================================================
    -- DVG TRANSACTIONS
    -- =====================================================
    {% for year in years %}
    d.nb_transactions_{{ year }} AS dvg_nb_transactions_{{ year }},
    d.prix_m2_moyen_{{ year }} AS dvg_prix_m2_moyen_{{ year }},
    {% endfor %}
    
    d.total_transactions_2019_2024 AS dvg_total_transactions_2019_2024,
    d.avg_annual_transactions AS dvg_avg_annual_transactions,
    d.evolution_prix_m2_2019_2023_pct AS dvg_evolution_prix_m2_2019_2023_pct,
    d.marche_dynamisme AS dvg_marche_dynamisme,
    
    -- =====================================================
    -- CEREMA CONSOMMATION ESPACES
    -- =====================================================
    c.conso_naf_total_ha,
    c.conso_art_2009_2024_ha,
    c.conso_activite_ha,
    c.conso_habitat_ha,
    c.conso_mixte_ha,
    c.surface_commune_ha,
    c.population_2015 AS conso_population_2015,
    c.population_2021 AS conso_population_2021,
    c.menages_2015 AS conso_menages_2015,
    c.menages_2021 AS conso_menages_2021,
    c.emplois_2015 AS conso_emplois_2015,
    c.emplois_2021 AS conso_emplois_2021,
    
    -- Artificialisation rate
    CASE 
        WHEN c.surface_commune_ha > 0 
        THEN ROUND(c.conso_naf_total_ha * 100.0 / c.surface_commune_ha, 4)
        ELSE NULL
    END AS taux_artificialisation_pct,
    
    -- =====================================================
    -- DGFIP FISCALITE
    -- =====================================================
    f.tfb_taux_global AS taux_tfb,
    f.tfb_taux_commune AS tfb_taux_commune,
    f.tfnb_taux_global AS taux_tfnb,
    f.th_taux_global AS taux_th,
    f.teom_taux,
    f.th_surtaxe_indicateur,
    f.th_surtaxe_residences_secondaires_pct,
    f.pression_fiscale_tfb_teom,
    f.epci_regime_fiscal,
    f.annee_reference AS fiscalite_annee_reference

FROM insee i
LEFT JOIN prix_volumes pv ON i.geo_code = pv.geo_code
LEFT JOIN dvg d ON i.geo_code = d.geo_code
LEFT JOIN conso c ON i.geo_code = c.geo_code
LEFT JOIN loyers l ON i.geo_code = l.geo_code
LEFT JOIN fiscalite f ON i.geo_code = f.geo_code
LEFT JOIN zonage_abc z ON i.geo_code = z.geo_code