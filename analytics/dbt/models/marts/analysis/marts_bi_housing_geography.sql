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
),

establishment_morphology_categorized AS (
    SELECT * FROM {{ ref('marts_public_establishments_morphology_catagorized') }}
),

establishment_morphology AS (
    SELECT * FROM {{ ref('marts_public_establishments_morphology') }}
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

    -- Loyer Predit M2 (Logic: Maison if house, else Appart)
    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.loyer_predit_m2_maisons
        ELSE cf.loyer_predit_m2_appartements
    END AS loyer_predit_m2,
    
    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.loyer_intervalle_bas_m2_maisons
        ELSE cf.loyer_intervalle_bas_m2_appartements
    END AS loyer_intervalle_bas_m2,

    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.loyer_intervalle_haut_m2_maisons
        ELSE cf.loyer_intervalle_haut_m2_appartements
    END AS loyer_intervalle_haut_m2,

    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.type_prediction_maisons
        ELSE cf.type_prediction_appartements
    END AS loyer_type_prediction,

    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.nb_observations_commune_maisons
        ELSE cf.nb_observations_commune_appartements
    END AS loyer_nb_obs_commune,

    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.nb_observations_maille_maisons
        ELSE cf.nb_observations_maille_appartements
    END AS loyer_nb_obs_maille,

    CASE 
        WHEN hk.housing_kind = 'MAISON' THEN cf.r2_adjusted_maisons
        ELSE cf.r2_adjusted_appartements
    END AS loyer_r2_adjusted,

    -- Niveau Loyer (Calculated)
    CASE 
        WHEN (CASE WHEN hk.housing_kind = 'MAISON' THEN cf.loyer_predit_m2_maisons ELSE cf.loyer_predit_m2_appartements END) < 10 THEN 'Bas'
        WHEN (CASE WHEN hk.housing_kind = 'MAISON' THEN cf.loyer_predit_m2_maisons ELSE cf.loyer_predit_m2_appartements END) < 15 THEN 'Moyen'
        ELSE 'Élevé'
    END AS niveau_loyer,
    
    -- Confiance Prediction (Based on R2)
    CASE 
        WHEN (CASE WHEN hk.housing_kind = 'MAISON' THEN cf.r2_adjusted_maisons ELSE cf.r2_adjusted_appartements END) > 0.8 THEN 'Forte'
        WHEN (CASE WHEN hk.housing_kind = 'MAISON' THEN cf.r2_adjusted_maisons ELSE cf.r2_adjusted_appartements END) > 0.5 THEN 'Moyenne'
        ELSE 'Faible'
    END AS loyer_confiance_prediction,

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
    
    -- Renamed DVG to DVF
    cf.dvf_nb_transactions_2019,
    cf.dvf_prix_m2_moyen_2019,
    cf.dvf_nb_transactions_2020,
    cf.dvf_prix_m2_moyen_2020,
    cf.dvf_nb_transactions_2021,
    cf.dvf_prix_m2_moyen_2021,
    cf.dvf_nb_transactions_2022,
    cf.dvf_prix_m2_moyen_2022,
    cf.dvf_nb_transactions_2023,
    cf.dvf_prix_m2_moyen_2023,
    cf.dvf_nb_transactions_2024,
    cf.dvf_prix_m2_moyen_2024,
    cf.dvf_total_transactions_2019_2024,
    cf.dvf_avg_annual_transactions,
    cf.dvf_evolution_prix_m2_2019_2023_pct,
    cf.dvf_marche_dynamisme,
    
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
    
    -- Fiscalite (Updated logic)
    cf.taux_tfb_2024 AS taux_tfb,
    cf.tfb_taux_commune_2024 AS tfb_taux_commune,
    cf.taux_tfnb_2024 AS taux_tfnb,
    cf.taux_th_2024 AS taux_th,
    cf.teom_taux_2024 AS teom_taux,
    cf.th_surtaxe_indicateur,
    cf.th_surtaxe_residences_secondaires_pct,
    cf.pression_fiscale_tfb_teom_2024 AS pression_fiscale_tfb_teom,
    cf.epci_regime_fiscal,
    cf.fiscalite_annee_reference,
    
    -- Fiscalite Categories (Based on Quartiles)
    CASE WHEN cf.taux_th_quartile = 1 THEN 'Faible' WHEN cf.taux_th_quartile = 2 THEN 'Moyen' WHEN cf.taux_th_quartile = 3 THEN 'Élevé' ELSE 'Très Élevé' END AS taux_th_category,
    CASE WHEN cf.taux_tfb_quartile = 1 THEN 'Faible' WHEN cf.taux_tfb_quartile = 2 THEN 'Moyen' WHEN cf.taux_tfb_quartile = 3 THEN 'Élevé' ELSE 'Très Élevé' END AS taux_tfb_category,
    CASE WHEN cf.taux_teom_quartile = 1 THEN 'Faible' WHEN cf.taux_teom_quartile = 2 THEN 'Moyen' WHEN cf.taux_teom_quartile = 3 THEN 'Élevé' ELSE 'Très Élevé' END AS taux_teom_category,
    CASE WHEN cf.taux_tfnb_quartile = 1 THEN 'Faible' WHEN cf.taux_tfnb_quartile = 2 THEN 'Moyen' WHEN cf.taux_tfnb_quartile = 3 THEN 'Élevé' ELSE 'Très Élevé' END AS taux_tfnb_category,

    -- Fiscalite Evolutions
    cf.evolution_taux_th_2021_2024_pct,
    cf.evolution_taux_tfb_2021_2024_pct,
    cf.evolution_taux_teom_2021_2024_pct,
    cf.evolution_taux_tfnb_2021_2024_pct,

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
    
    -- TLV / THLV
    cf.tlv_2026,
    cf.tlv_2023,
    cf.tlv_2013,
    cf.years_in_tlv,
    cf.is_in_tlv_territory,
    cf.is_in_thlv_territory,
    cf.date_thlv,
    
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
        CASE WHEN cf.is_in_tlv_territory THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.action_coeur_de_ville, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.petite_ville_de_demain, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.village_davenir, FALSE) THEN 1 ELSE 0 END +
        CASE WHEN c.opah IS NOT NULL AND c.opah > 0 THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(c.ort_signed, FALSE) THEN 1 ELSE 0 END
    ) AS special_territory_count,
    
    (
        cf.is_in_tlv_territory OR
        COALESCE(c.action_coeur_de_ville, FALSE) OR
        COALESCE(c.petite_ville_de_demain, FALSE) OR
        COALESCE(c.village_davenir, FALSE) OR
        (c.opah IS NOT NULL AND c.opah > 0) OR
        COALESCE(c.ort_signed, FALSE)
    ) AS has_any_special_territory,

    -- Aggregated Housing Counts (from marts_public_establishments_morphology)
    em.count_housing AS count_housing,
    em.count_housing_private AS count_housing_private,
    em.count_housing_rented_production AS count_housing_private_rented,
    em.count_vacant_housing AS count_vacant_housing,
    em.count_housing_vacant_production AS count_vacant_housing_private,
    em.count_vacant_housing_private_fil AS count_vacant_housing_private_fil,
    emc.housing_vacant_rate AS housing_vacant_rate,

    -- Categorized Morphology Data (from marts_public_establishments_morphology_catagorized)
    emc.kind_housing_vacant_2025 AS kind_housing_vacant_2025, -- 2025 columns from CSV requested, but SQL has 2024. Assuming projection or latest year available.
    emc.kind_housing_vacant_same_as_2025 AS kind_housing_vacant_same_as_2025, -- Using available logic.
    emc.housing_vacant_rate AS kind_housing_vacant_rate_2025,
    emc.kind_housing_vacant_rate_same_as_2025 AS kind_housing_vacant_rate_same_as_2025,

    -- Evolutions
    emc.housing_vacant_evolution_19_25 AS housing_vacant_evolution_19_25,
    emc.housing_vacant_rate_evolution_19_25 AS housing_vacant_rate_evolution_19_25

FROM {{ ref('int_analysis_housing_with_out_flag') }} h
LEFT JOIN city_features cf ON h.geo_code = cf.geo_code
LEFT JOIN {{ ref('int_production_housing') }} hk ON CAST(h.housing_id AS UUID) = hk.id
LEFT JOIN {{ ref('marts_common_cities') }} c ON h.geo_code = c.city_code
LEFT JOIN establishment_morphology_categorized emc ON h.geo_code = emc.establishment_id AND emc.data_year = 2025
LEFT JOIN establishment_morphology em ON h.geo_code = em.establishment_id AND em.year = 2025
