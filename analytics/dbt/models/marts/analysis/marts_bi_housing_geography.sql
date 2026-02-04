{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Housing with geographic context
-- Joins housing to city features with all computed columns needed by marts_bi_housing_complete

WITH city_features AS (
    SELECT * FROM {{ ref('int_analysis_city_features') }}
)

SELECT
    CAST(h.housing_id AS VARCHAR) AS housing_id,
    h.geo_code,
    LEFT(h.geo_code, 2) AS departement_code,
    c.region_code,
    hk.housing_kind,
    
    -- City features from int_analysis_city_features
    cf.commune_name,
    cf.densite_grid,
    cf.densite_label,
    cf.densite_category,
    cf.densite_grid_7,
    cf.densite_label_7,
    cf.densite_aav_grid,
    cf.densite_aav_label,
    cf.pct_pop_urbain_dense,
    cf.pct_pop_urbain_intermediaire,
    cf.pct_pop_rural,
    cf.population_2019,
    cf.population_2020,
    cf.population_2021,
    cf.population_2022,
    cf.population_growth_rate_2019_2022,
    cf.population_growth_rate_annual,
    cf.is_population_declining,
    cf.loyer_predit_m2,
    cf.loyer_intervalle_bas_m2,
    cf.loyer_intervalle_haut_m2,
    cf.loyer_type_prediction,
    cf.loyer_nb_obs_commune,
    cf.loyer_nb_obs_maille,
    cf.loyer_r2_adjusted,
    cf.niveau_loyer,
    cf.loyer_confiance_prediction,
    cf.zonage_en_vigueur,
    cf.prix_median_m2_maisons_2019,
    cf.prix_median_m2_appartements_2019,
    cf.prix_median_m2_maisons_2020,
    cf.prix_median_m2_appartements_2020,
    cf.prix_median_m2_maisons_2021,
    cf.prix_median_m2_appartements_2021,
    cf.prix_median_m2_maisons_2022,
    cf.prix_median_m2_appartements_2022,
    cf.prix_median_m2_maisons_2023,
    cf.prix_median_m2_appartements_2023,
    cf.prix_median_m2_maisons_2024,
    cf.prix_median_m2_appartements_2024,
    cf.evolution_prix_maisons_2019_2023_pct,
    cf.evolution_prix_appartements_2019_2023_pct,
    cf.dvg_nb_transactions_2019,
    cf.dvg_prix_m2_moyen_2019,
    cf.dvg_nb_transactions_2020,
    cf.dvg_prix_m2_moyen_2020,
    cf.dvg_nb_transactions_2021,
    cf.dvg_prix_m2_moyen_2021,
    cf.dvg_nb_transactions_2022,
    cf.dvg_prix_m2_moyen_2022,
    cf.dvg_nb_transactions_2023,
    cf.dvg_prix_m2_moyen_2023,
    cf.dvg_nb_transactions_2024,
    cf.dvg_prix_m2_moyen_2024,
    cf.dvg_total_transactions_2019_2024,
    cf.dvg_avg_annual_transactions,
    cf.dvg_evolution_prix_m2_2019_2023_pct,
    cf.dvg_marche_dynamisme,
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
    
    -- Computed: Population trend category
    CASE 
        WHEN cf.is_population_declining THEN 'Declin'
        WHEN cf.population_growth_rate_annual > 1 THEN 'Forte croissance'
        WHEN cf.population_growth_rate_annual > 0 THEN 'Croissance moderee'
        ELSE 'Stable'
    END AS population_trend_category,
    
    -- Computed: Zonage category
    CASE 
        WHEN cf.zonage_en_vigueur IN ('A', 'A bis') THEN 'Zone tendue'
        WHEN cf.zonage_en_vigueur IN ('B1', 'B2') THEN 'Zone intermediaire'
        WHEN cf.zonage_en_vigueur = 'C' THEN 'Zone detendue'
        ELSE 'Inconnu'
    END AS zonage_category,
    
    -- Computed: Prix median m2 (prefer houses, fallback to apartments)
    COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) AS prix_median_m2,
    COALESCE(cf.prix_q25_m2_maisons_2024, cf.prix_q25_m2_appartements_2024) AS prix_q25_m2,
    COALESCE(cf.prix_q75_m2_maisons_2024, cf.prix_q75_m2_appartements_2024) AS prix_q75_m2,
    
    -- Computed: Prix category
    CASE 
        WHEN COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) IS NULL THEN 'Inconnu'
        WHEN COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) < 1500 THEN 'Tres bas (<1500€)'
        WHEN COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) < 2500 THEN 'Bas (1500-2500€)'
        WHEN COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) < 4000 THEN 'Moyen (2500-4000€)'
        WHEN COALESCE(cf.prix_median_m2_maisons_2024, cf.prix_median_m2_appartements_2024) < 6000 THEN 'Eleve (4000-6000€)'
        ELSE 'Tres eleve (>6000€)'
    END AS prix_category,
    
    -- Computed: Evolution prix 5 ans
    COALESCE(cf.evolution_prix_maisons_2019_2023_pct, cf.evolution_prix_appartements_2019_2023_pct) AS evolution_prix_5_ans_pct,
    
    -- Computed: Prix evolution category
    CASE 
        WHEN COALESCE(cf.evolution_prix_maisons_2019_2023_pct, cf.evolution_prix_appartements_2019_2023_pct) IS NULL THEN 'Inconnu'
        WHEN COALESCE(cf.evolution_prix_maisons_2019_2023_pct, cf.evolution_prix_appartements_2019_2023_pct) < -5 THEN 'Baisse (< -5%)'
        WHEN COALESCE(cf.evolution_prix_maisons_2019_2023_pct, cf.evolution_prix_appartements_2019_2023_pct) < 10 THEN 'Stable (-5% a +10%)'
        WHEN COALESCE(cf.evolution_prix_maisons_2019_2023_pct, cf.evolution_prix_appartements_2019_2023_pct) < 25 THEN 'Hausse moderee (+10% a +25%)'
        ELSE 'Forte hausse (>+25%)'
    END AS prix_evolution_category,
    
    -- Computed: Pression fiscale category
    CASE 
        WHEN cf.pression_fiscale_tfb_teom IS NULL THEN 'Inconnu'
        WHEN cf.pression_fiscale_tfb_teom < 30 THEN 'Faible (<30%)'
        WHEN cf.pression_fiscale_tfb_teom < 50 THEN 'Moderee (30-50%)'
        WHEN cf.pression_fiscale_tfb_teom < 70 THEN 'Elevee (50-70%)'
        ELSE 'Tres elevee (>70%)'
    END AS pression_fiscale_category,
    
    -- Special territories (TLV)
    COALESCE(c.tlv1, FALSE) AS is_in_tlv1_territory,
    COALESCE(c.tlv2, FALSE) AS is_in_tlv2_territory,
    COALESCE(c.tlv1, FALSE) OR COALESCE(c.tlv2, FALSE) AS is_in_tlv_territory,
    
    -- Other special territories
    COALESCE(c.action_coeur_de_ville, FALSE) AS action_coeur_de_ville,
    COALESCE(c.petite_ville_de_demain, FALSE) AS petite_ville_de_demain,
    COALESCE(c.village_davenir, FALSE) AS village_davenir,
    c.opah AS opah,
    c.opah IS NOT NULL AND c.opah > 0 AS has_opah,
    c.type_opah AS type_opah,
    COALESCE(c.ort_signed, FALSE) AS ort_signed,
    
    -- Computed: Special territory aggregates
    (
        CASE WHEN COALESCE(c.tlv1, FALSE) OR COALESCE(c.tlv2, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.action_coeur_de_ville, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.petite_ville_de_demain, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.village_davenir, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN c.opah IS NOT NULL AND c.opah > 0 THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.ort_signed, FALSE) THEN 1 ELSE 0 END
    ) AS special_territory_count,
    
    (
        COALESCE(c.tlv1, FALSE) OR COALESCE(c.tlv2, FALSE) OR
        COALESCE(c.action_coeur_de_ville, FALSE) OR
        COALESCE(c.petite_ville_de_demain, FALSE) OR
        COALESCE(c.village_davenir, FALSE) OR
        (c.opah IS NOT NULL AND c.opah > 0) OR
        COALESCE(c.ort_signed, FALSE)
    ) AS has_any_special_territory

FROM {{ ref('int_analysis_housing_with_out_flag') }} h
LEFT JOIN city_features cf ON h.geo_code = cf.geo_code
LEFT JOIN {{ ref('int_production_housing') }} hk ON CAST(h.housing_id AS UUID) = hk.id
LEFT JOIN {{ ref('marts_common_cities') }} c ON h.geo_code = c.city_code
