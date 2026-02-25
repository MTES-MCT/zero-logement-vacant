{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Complete denormalized table for comprehensive vacancy exit analysis
-- Joins all modular tables with additional composite features
-- Housing-level ZLV features from int_analysis_housing_zlv_usage
-- Dual-echelon establishment features from marts_bi_housing_zlv_usage (EPCI + Commune)

WITH characteristics AS (
    SELECT * FROM {{ ref('marts_bi_housing_characteristics') }}
),

geography AS (
    SELECT * FROM {{ ref('marts_bi_housing_geography') }}
),

owners AS (
    SELECT * FROM {{ ref('marts_bi_housing_owners') }}
),

zlv_usage AS (
    SELECT * FROM {{ ref('marts_bi_housing_zlv_usage') }}
),

housing_zlv AS (
    SELECT * FROM {{ ref('int_analysis_housing_zlv_usage') }}
)

SELECT
    -- =====================================================
    -- IDENTIFIERS (from characteristics)
    -- =====================================================
    c.housing_id,
    c.geo_code,
    
    -- =====================================================
    -- TARGET VARIABLE
    -- =====================================================
    c.is_housing_out,
    c.vacancy_status_label,
    
    -- =====================================================
    -- HOUSING CHARACTERISTICS
    -- =====================================================
    c.housing_kind,
    c.housing_kind_label,
    c.rooms_count,
    c.rooms_count_category,
    c.living_area,
    c.living_area_category,
    c.surface_category,
    c.building_year,
    c.building_year_category,
    c.building_age,
    c.building_age_category,
    c.building_location,
    c.condominium,
    c.energy_consumption_bdnb,
    c.energy_consumption_category,
    c.is_energy_sieve,
    c.cadastral_classification,
    c.cadastral_classification_label,
    c.uncomfortable,
    c.is_uncomfortable,
    c.taxed,
    c.is_taxed,
    c.beneficiary_count,
    c.rental_value,
    c.rental_value_category,
    c.vacancy_start_year,
    c.years_in_vacancy,
    c.vacancy_duration_category,
    c.vacancy_severity,
    c.mutation_date,
    c.last_mutation_date,
    c.last_mutation_type,
    c.last_transaction_date,
    c.last_transaction_value,
    c.has_recent_mutation,
    c.data_source,
    c.data_years_count,
    
    -- =====================================================
    -- GEOGRAPHY
    -- =====================================================
    g.commune_name,
    g.departement_code,
    g.densite_grid,
    g.densite_label,
    g.densite_category,
    g.densite_grid_7,
    g.densite_label_7,
    g.densite_aav_grid,
    g.densite_aav_label,
    g.pct_pop_urbain_dense,
    g.pct_pop_urbain_intermediaire,
    g.pct_pop_rural,
    g.population_2019,
    g.population_2020,
    g.population_2021,
    g.population_2022,
    g.population_growth_rate_2019_2022,
    g.population_growth_rate_annual,
    g.is_population_declining,
    g.zonage_en_vigueur,
    g.loyer_predit_m2,
    g.loyer_intervalle_bas_m2,
    g.loyer_intervalle_haut_m2,
    g.loyer_type_prediction,
    g.niveau_loyer,
    g.loyer_confiance_prediction,
    g.prix_median_m2_maisons_2024,
    g.prix_median_m2_appartements_2024,
    g.prix_median_m2,
    g.prix_q25_m2,
    g.prix_q75_m2,
    g.prix_category,
    g.evolution_prix_maisons_2019_2023_pct,
    g.evolution_prix_appartements_2019_2023_pct,
    g.evolution_prix_5_ans_pct,
    g.prix_evolution_category,
    g.dvg_nb_transactions_2024,
    g.dvg_prix_m2_moyen_2024,
    g.dvg_total_transactions_2019_2024,
    g.dvg_avg_annual_transactions,
    g.dvg_evolution_prix_m2_2019_2023_pct,
    g.dvg_marche_dynamisme,
    g.conso_naf_total_ha,
    g.conso_art_2009_2024_ha,
    g.conso_habitat_ha,
    g.surface_commune_ha,
    g.taux_artificialisation_pct,
    g.conso_population_2021,
    g.conso_menages_2021,
    g.conso_emplois_2021,
    g.taux_tfb,
    g.tfb_taux_commune,
    g.taux_tfnb,
    g.taux_th,
    g.teom_taux,
    g.th_surtaxe_indicateur,
    g.th_surtaxe_residences_secondaires_pct,
    g.pression_fiscale_tfb_teom,
    g.epci_regime_fiscal,
    g.fiscalite_annee_reference,
    g.pression_fiscale_category,
    g.is_in_tlv1_territory,
    g.is_in_tlv2_territory,
    g.is_in_tlv_territory,
    g.action_coeur_de_ville,
    g.petite_ville_de_demain,
    g.village_davenir,
    g.opah,
    g.has_opah,
    g.type_opah,
    g.ort_signed,
    g.special_territory_count,
    g.has_any_special_territory,
    
    -- =====================================================
    -- OWNERS
    -- =====================================================
    o.owner_id,
    o.owner_kind_class,
    o.owner_kind_category,
    o.owner_is_individual,
    o.owner_is_sci,
    o.owner_is_company,
    o.owner_is_indivision,
    o.owner_birth_date,
    o.owner_age,
    o.owner_age_category,
    o.owner_generation,
    o.owner_postal_code,
    o.owner_city,
    o.owner_department_code,
    o.owner_location_relative_label,
    o.owner_is_local,
    o.owner_is_distant,
    o.owner_distance_km,
    o.owner_distance_category,
    o.property_right,
    o.property_right_category,
    o.owner_is_full_owner,
    o.owner_housing_count,
    o.owner_is_multi_owner,
    o.owner_portfolio_category,
    o.owner_has_email,
    o.owner_has_phone,
    o.owner_contactable,
    
    -- =====================================================
    -- HOUSING-LEVEL ZLV USAGE (from int_analysis_housing_zlv_usage)
    -- =====================================================
    COALESCE(hz.was_contacted_by_zlv, FALSE) AS was_contacted_by_zlv,
    COALESCE(hz.contact_count, 0) AS contact_count,
    COALESCE(hz.contact_intensity, 'Non contacte') AS contact_intensity,
    hz.first_contact_date,
    hz.last_contact_date,
    hz.days_since_first_contact,
    hz.days_since_last_contact,
    COALESCE(hz.contact_recency_category, 'Jamais contacte') AS contact_recency_category,
    hz.first_campaign_created,
    hz.last_campaign_created,
    hz.first_campaign_sent_date,
    hz.last_campaign_sent_date,
    COALESCE(hz.total_campaigns_validated, 0) AS total_campaigns_validated,
    COALESCE(hz.total_campaigns_confirmed, 0) AS total_campaigns_confirmed,
    COALESCE(hz.total_campaigns_received, 0) AS total_campaigns_received,
    COALESCE(hz.total_campaigns_sent, 0) AS total_campaigns_sent,
    COALESCE(hz.has_received_campaign, FALSE) AS has_received_campaign,
    COALESCE(hz.total_groups, 0) AS total_groups,
    hz.group_titles,
    hz.first_group_created,
    hz.last_group_created,
    hz.first_group_exported,
    hz.last_group_exported,
    COALESCE(hz.is_in_group, FALSE) AS is_in_group,
    COALESCE(hz.group_intensity, 'Aucun groupe') AS group_intensity,
    COALESCE(hz.was_exported_from_group, FALSE) AS was_exported_from_group,
    hz.last_event_status_followup,
    hz.last_event_status_label_followup,
    hz.last_event_date_followup,
    hz.last_event_status_zlv_followup,
    hz.last_event_status_label_zlv_followup,
    hz.last_event_date_zlv_followup,
    hz.last_event_status_user_followup,
    hz.last_event_status_label_user_followup,
    hz.last_event_date_user_followup,
    hz.last_event_sub_status_label_user_followup,
    COALESCE(hz.has_status_update, FALSE) AS has_status_update,
    COALESCE(hz.has_user_followup_update, FALSE) AS has_user_followup_update,
    COALESCE(hz.has_zlv_followup_update, FALSE) AS has_zlv_followup_update,
    hz.last_event_status_occupancy,
    hz.last_event_status_label_occupancy,
    hz.last_event_date_occupancy,
    hz.last_event_status_zlv_occupancy,
    hz.last_event_status_label_zlv_occupancy,
    hz.last_event_date_zlv_occupancy,
    hz.last_event_status_user_occupancy,
    hz.last_event_status_label_user_occupancy,
    hz.last_event_date_user_occupancy,
    hz.last_event_sub_status_label_user_occupancy,
    COALESCE(hz.has_occupancy_update, FALSE) AS has_occupancy_update,
    COALESCE(hz.has_user_occupancy_update, FALSE) AS has_user_occupancy_update,
    COALESCE(hz.has_zlv_occupancy_update, FALSE) AS has_zlv_occupancy_update,
    COALESCE(hz.has_any_update, FALSE) AS has_any_update,
    COALESCE(hz.update_intensity, 'Aucune MAJ') AS update_intensity,
    hz.days_since_last_followup_update,
    hz.days_since_last_occupancy_update,
    COALESCE(hz.is_on_user_territory, FALSE) AS is_on_user_territory,

    -- =====================================================
    -- EPCI ESTABLISHMENT (from dual-echelon marts_bi_housing_zlv_usage)
    -- =====================================================
    z.epci_establishment_id,
    z.epci_nom,
    z.epci_ouvert,
    z.epci_date_ouverture,
    z.epci_annee_ouverture,
    z.epci_utilisateurs_inscrits,
    z.epci_date_derniere_connexion,
    z.epci_connecte_30_jours,
    z.epci_connecte_60_jours,
    z.epci_connecte_90_jours,
    z.epci_a_1_logement_maj_situation,
    z.epci_a_1_logement_maj_occupation,
    z.epci_a_1_logement_maj_suivi,
    z.epci_a_1_logement_maj_enrichissement,
    z.epci_logements_maj_situation,
    z.epci_logements_maj_enrichissement,
    z.epci_date_premiere_maj_situation,
    z.epci_date_premiere_maj_enrichissement,
    z.epci_date_derniere_maj_situation,
    z.epci_date_derniere_maj_enrichissement,
    z.epci_logements_maj_situation_pct_parc_vacant_25,
    z.epci_logements_maj_situation_pct_parc_locatif_24,
    z.epci_logements_maj_occupation,
    z.epci_logements_maj_suivi,
    z.epci_logements_maj_non_suivi,
    z.epci_logements_maj_en_attente,
    z.epci_logements_maj_premier_contact,
    z.epci_logements_maj_suivi_en_cours,
    z.epci_logements_maj_suivi_termine,
    z.epci_logements_maj_suivi_termine_sortis,
    z.epci_logements_maj_suivi_termine_fiabilises,
    z.epci_logements_maj_bloque,
    z.epci_logements_maj_mails,
    z.epci_logements_maj_phone,
    z.epci_logements_maj_owners,
    z.epci_logements_maj_owners_address,
    z.epci_logements_maj_dpe,
    z.epci_logements_maj_notes,
    z.epci_logements_maj_documents,
    z.epci_documents_importes,
    z.epci_date_dernier_document_importe,
    z.epci_a_1_groupe_cree,
    z.epci_logements_exportes_via_groupes,
    z.epci_groupes_exportes,
    z.epci_groupes_crees,
    z.epci_date_dernier_groupe_cree,
    z.epci_logements_contactes_via_campagnes,
    z.epci_a_1_campagne_envoyee_et_1_maj_situation,
    z.epci_a_1_campagne_creee,
    z.epci_a_1_campagne_creee_30_jours,
    z.epci_a_1_campagne_envoyee,
    z.epci_campagnes_envoyees,
    z.epci_campagnes_exportees,
    z.epci_campagnes_creees,
    z.epci_date_premiere_campagne_creee,
    z.epci_date_derniere_campagne_creee,
    z.epci_a_1_perimetre_importe,
    z.epci_perimetres_importes,
    z.epci_couches_perimetres_importes,
    z.epci_region,
    z.epci_departement,
    z.epci_type_detaille,
    z.epci_type_simple,
    z.epci_mails_utilisateurs,
    z.epci_communes_inscrites,
    z.epci_communes_inscrites_pct,

    -- =====================================================
    -- COMMUNE ESTABLISHMENT (from dual-echelon marts_bi_housing_zlv_usage)
    -- =====================================================
    z.city_establishment_id,
    z.city_nom,
    z.city_ouvert,
    z.city_date_ouverture,
    z.city_annee_ouverture,
    z.city_utilisateurs_inscrits,
    z.city_date_derniere_connexion,
    z.city_connecte_30_jours,
    z.city_connecte_60_jours,
    z.city_connecte_90_jours,
    z.city_connexions_30_jours,
    z.city_connexions_60_jours,
    z.city_connexions_90_jours,
    z.city_a_1_logement_maj_situation,
    z.city_a_1_logement_maj_occupation,
    z.city_a_1_logement_maj_suivi,
    z.city_a_1_logement_maj_enrichissement,
    z.city_logements_maj_situation,
    z.city_logements_maj_enrichissement,
    z.city_date_premiere_maj_situation,
    z.city_date_premiere_maj_enrichissement,
    z.city_date_derniere_maj_situation,
    z.city_date_derniere_maj_enrichissement,
    z.city_logements_maj_situation_pct_parc_vacant_25,
    z.city_logements_maj_situation_pct_parc_locatif_24,
    z.city_logements_maj_occupation,
    z.city_logements_maj_suivi,
    z.city_logements_maj_non_suivi,
    z.city_logements_maj_en_attente,
    z.city_logements_maj_premier_contact,
    z.city_logements_maj_suivi_en_cours,
    z.city_logements_maj_suivi_termine,
    z.city_logements_maj_suivi_termine_sortis,
    z.city_logements_maj_suivi_termine_fiabilises,
    z.city_logements_maj_bloque,
    z.city_logements_maj_mails,
    z.city_logements_maj_phone,
    z.city_logements_maj_owners,
    z.city_logements_maj_owners_address,
    z.city_logements_maj_dpe,
    z.city_logements_maj_notes,
    z.city_logements_maj_documents,
    z.city_documents_importes,
    z.city_date_dernier_document_importe,
    z.city_a_1_groupe_cree,
    z.city_logements_exportes_via_groupes,
    z.city_groupes_exportes,
    z.city_groupes_crees,
    z.city_date_dernier_groupe_cree,
    z.city_logements_contactes_via_campagnes,
    z.city_a_1_campagne_envoyee_et_1_maj_situation,
    z.city_a_1_campagne_creee,
    z.city_a_1_campagne_creee_30_jours,
    z.city_a_1_campagne_envoyee,
    z.city_campagnes_envoyees,
    z.city_campagnes_exportees,
    z.city_campagnes_creees,
    z.city_date_premiere_campagne_creee,
    z.city_date_derniere_campagne_creee,
    z.city_a_1_perimetre_importe,
    z.city_perimetres_importes,
    z.city_couches_perimetres_importes,
    z.city_region,
    z.city_departement,
    z.city_type_detaille,
    z.city_type_simple,
    z.city_mails_utilisateurs,

    -- =====================================================
    -- CROSS-DIMENSION INTERACTIONS
    -- =====================================================
    CASE 
        WHEN o.owner_is_local AND g.zonage_category = 'Zone tendue' THEN 'Local + Zone tendue'
        WHEN o.owner_is_local AND g.zonage_category = 'Zone detendue' THEN 'Local + Zone detendue'
        WHEN o.owner_is_distant AND g.zonage_category = 'Zone tendue' THEN 'Distant + Zone tendue'
        WHEN o.owner_is_distant AND g.zonage_category = 'Zone detendue' THEN 'Distant + Zone detendue'
        WHEN o.owner_is_local AND g.densite_category = 'Rural' THEN 'Local + Rural'
        WHEN o.owner_is_distant AND g.densite_category = 'Rural' THEN 'Distant + Rural'
        ELSE 'Autre'
    END AS owner_x_territory,
    
    CASE 
        WHEN c.housing_kind = 'maison' AND g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') THEN 'Maison + Marche dynamique'
        WHEN c.housing_kind = 'maison' AND g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') THEN 'Maison + Marche atone'
        WHEN c.housing_kind = 'appartement' AND g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') THEN 'Appartement + Marche dynamique'
        WHEN c.housing_kind = 'appartement' AND g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') THEN 'Appartement + Marche atone'
        ELSE 'Autre'
    END AS housing_x_market,
    
    CASE 
        WHEN c.vacancy_duration_category = 'Plus de 10 ans' AND c.is_energy_sieve THEN 'Longue duree + Passoire'
        WHEN c.vacancy_duration_category IN ('6-10 ans', 'Plus de 10 ans') AND c.is_energy_sieve THEN 'Moyenne-longue duree + Passoire'
        WHEN c.vacancy_duration_category = '0-2 ans' AND NOT c.is_energy_sieve THEN 'Courte duree + Performant'
        WHEN c.vacancy_duration_category IN ('0-2 ans', '3-5 ans') AND NOT c.is_energy_sieve THEN 'Courte-moyenne duree + Performant'
        ELSE 'Autre'
    END AS vacancy_x_energy,

    -- =====================================================
    -- ANALYSIS-READY FLAGS
    -- =====================================================
    CASE 
        WHEN (
            (g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') OR g.zonage_category = 'Zone tendue')
            AND o.owner_is_local
            AND c.vacancy_duration_category IN ('0-2 ans', '3-5 ans')
            AND NOT c.is_energy_sieve
        ) THEN TRUE
        ELSE FALSE
    END AS is_favorable_for_exit,
    
    CASE 
        WHEN (
            (g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') AND g.is_population_declining)
            AND (o.owner_is_distant OR NOT o.owner_is_individual)
            AND c.vacancy_duration_category IN ('6-10 ans', 'Plus de 10 ans')
            AND c.is_energy_sieve
        ) THEN TRUE
        ELSE FALSE
    END AS is_at_risk_long_vacancy,
    
    -- =====================================================
    -- ROW COUNT FOR AGGREGATION
    -- =====================================================
    1 AS total_count

FROM characteristics c
LEFT JOIN geography g ON c.housing_id = g.housing_id
LEFT JOIN owners o ON c.housing_id = o.housing_id
LEFT JOIN zlv_usage z ON c.housing_id = z.housing_id
LEFT JOIN housing_zlv hz ON c.housing_id = CAST(hz.housing_id AS VARCHAR)
