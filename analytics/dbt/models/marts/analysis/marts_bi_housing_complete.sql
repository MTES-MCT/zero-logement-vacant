{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Complete denormalized table for comprehensive vacancy exit analysis
-- Joins all 4 modular tables with additional composite features

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
    -- ZLV USAGE
    -- =====================================================
    z.establishment_id,
    z.was_contacted_by_zlv,
    z.contact_intensity,
    z.first_contact_date,
    z.last_contact_date,
    z.days_since_first_contact,
    z.days_since_last_contact,
    z.contact_recency_category,
    z.total_campaigns_received,
    z.total_campaigns_sent,
    z.has_received_campaign,
    z.has_status_update,
    z.has_occupancy_update,
    z.has_any_update,
    z.update_intensity,
    z.establishment_name,
    z.establishment_kind,
    z.establishment_kind_label,
    z.establishment_type_regroupe,
    z.connecte_90_derniers_jours,
    z.connecte_60_derniers_jours,
    z.connecte_30_derniers_jours,
    z.typologie_activation_simple,
    z.typologie_activation_detaillee,
    z.activation_level,
    z.kind_pro_activity_quantile,
    z.kind_pro_activity_ntile,
    z.total_pro_activity_score,
    z.pro_activity_level,
    z.total_campaigns_sent_establishment,
    z.housing_contacted_2024,
    z.housing_contacted_2023,
    z.housing_rate_contacted_2024,
    z.establishment_user_count,
    z.establishment_has_active_users,
    z.zlv_engagement_score,
    z.zlv_engagement_category,
    
    -- =====================================================
    -- CROSS-DIMENSION INTERACTIONS
    -- =====================================================
    -- Owner x Territory
    CASE 
        WHEN o.owner_is_local AND g.zonage_category = 'Zone tendue' THEN 'Local + Zone tendue'
        WHEN o.owner_is_local AND g.zonage_category = 'Zone detendue' THEN 'Local + Zone detendue'
        WHEN o.owner_is_distant AND g.zonage_category = 'Zone tendue' THEN 'Distant + Zone tendue'
        WHEN o.owner_is_distant AND g.zonage_category = 'Zone detendue' THEN 'Distant + Zone detendue'
        WHEN o.owner_is_local AND g.densite_category = 'Rural' THEN 'Local + Rural'
        WHEN o.owner_is_distant AND g.densite_category = 'Rural' THEN 'Distant + Rural'
        ELSE 'Autre'
    END AS owner_x_territory,
    
    -- Housing x Market
    CASE 
        WHEN c.housing_kind = 'maison' AND g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') THEN 'Maison + Marche dynamique'
        WHEN c.housing_kind = 'maison' AND g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') THEN 'Maison + Marche atone'
        WHEN c.housing_kind = 'appartement' AND g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') THEN 'Appartement + Marche dynamique'
        WHEN c.housing_kind = 'appartement' AND g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') THEN 'Appartement + Marche atone'
        ELSE 'Autre'
    END AS housing_x_market,
    
    -- Vacancy x Energy
    CASE 
        WHEN c.vacancy_duration_category = 'Plus de 10 ans' AND c.is_energy_sieve THEN 'Longue duree + Passoire'
        WHEN c.vacancy_duration_category IN ('6-10 ans', 'Plus de 10 ans') AND c.is_energy_sieve THEN 'Moyenne-longue duree + Passoire'
        WHEN c.vacancy_duration_category = '0-2 ans' AND NOT c.is_energy_sieve THEN 'Courte duree + Performant'
        WHEN c.vacancy_duration_category IN ('0-2 ans', '3-5 ans') AND NOT c.is_energy_sieve THEN 'Courte-moyenne duree + Performant'
        ELSE 'Autre'
    END AS vacancy_x_energy,
    
    -- Contact x Activation
    CASE 
        WHEN z.was_contacted_by_zlv AND z.typologie_activation_simple LIKE '(4)%' THEN 'Contacte + CT activee'
        WHEN z.was_contacted_by_zlv AND z.typologie_activation_simple LIKE '(3)%' THEN 'Contacte + CT en campagne'
        WHEN NOT z.was_contacted_by_zlv AND z.typologie_activation_simple LIKE '(4)%' THEN 'Non contacte + CT activee'
        WHEN NOT z.was_contacted_by_zlv AND z.typologie_activation_simple LIKE '(1)%' THEN 'Non contacte + CT inactive'
        ELSE 'Autre'
    END AS contact_x_activation,
    
    -- =====================================================
    -- ANALYSIS-READY FLAGS
    -- =====================================================
    -- Favorable for exit: combination of positive factors
    CASE 
        WHEN (
            -- Good market conditions
            (g.dvg_marche_dynamisme IN ('Tres dynamique', 'Dynamique') OR g.zonage_category = 'Zone tendue')
            -- Local owner
            AND o.owner_is_local
            -- Short vacancy
            AND c.vacancy_duration_category IN ('0-2 ans', '3-5 ans')
            -- Good energy
            AND NOT c.is_energy_sieve
        ) THEN TRUE
        ELSE FALSE
    END AS is_favorable_for_exit,
    
    -- At risk for long vacancy: combination of negative factors
    CASE 
        WHEN (
            -- Bad market conditions
            (g.dvg_marche_dynamisme IN ('Peu dynamique', 'Atone') AND g.is_population_declining)
            -- Distant owner OR company
            AND (o.owner_is_distant OR NOT o.owner_is_individual)
            -- Long vacancy
            AND c.vacancy_duration_category IN ('6-10 ans', 'Plus de 10 ans')
            -- Energy sieve
            AND c.is_energy_sieve
        ) THEN TRUE
        ELSE FALSE
    END AS is_at_risk_long_vacancy,
    
    -- ZLV treatment flag (for quasi-experimental analysis)
    CASE 
        WHEN z.was_contacted_by_zlv AND z.activation_level >= 3 THEN 'Traitement fort'
        WHEN z.was_contacted_by_zlv AND z.activation_level < 3 THEN 'Traitement faible'
        WHEN NOT z.was_contacted_by_zlv AND z.activation_level >= 3 THEN 'Non traite - CT active'
        WHEN NOT z.was_contacted_by_zlv AND z.activation_level < 3 THEN 'Non traite - CT inactive'
        ELSE 'Indetermine'
    END AS zlv_treatment_group,
    
    -- =====================================================
    -- ROW COUNT FOR AGGREGATION
    -- =====================================================
    1 AS total_count

FROM characteristics c
LEFT JOIN geography g ON c.housing_id = g.housing_id
LEFT JOIN owners o ON c.housing_id = o.housing_id
LEFT JOIN zlv_usage z ON c.housing_id = z.housing_id
