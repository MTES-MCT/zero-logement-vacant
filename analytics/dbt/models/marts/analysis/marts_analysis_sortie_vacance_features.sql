-- Mart: Feature table for vacancy exit analysis (PRD 00 — Sortie de la vacance v3)
-- Grain: 1 row per cohort housing unit
-- Spine: int_analysis_housing_with_out_flag (cohort = units with ≥1 LOVAC tag 2019–2025)
-- Every cohort row is preserved (LEFT JOINs only).
-- Every sparse feature family ships a paired *_is_missing boolean.
-- Row count invariant: equals cohort size (2,530,118).

WITH cohort AS (
    SELECT
        housing_id,
        geo_code,
        vacancy_start_year,
        is_housing_out,
        vacancy_status_label,
        years_in_vacancy,
        vacancy_duration_category,
        lovac_years_present,
        has_lovac_history
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

-- City mapping to resolve arrondissements → city_code
city_mapping AS (
    SELECT geo_code, city_code
    FROM {{ ref('int_common_cities_mapping') }}
),

-- Housing-level morphology + energy features from int_production_housing
housing_features AS (
    SELECT
        h.id                                AS housing_id,
        h.housing_kind,
        h.rooms_count,
        h.living_area,
        h.building_year,
        h.uncomfortable,
        h.cadastral_classification,
        h.rental_value,
        h.beneficiary_count,
        h.condominium,
        h.energy_consumption_bdnb,
        h.energy_consumption_at_bdnb,
        h.actual_dpe,
        -- Derived: living area category
        CASE
            WHEN h.living_area IS NULL                THEN NULL
            WHEN h.living_area < 30                   THEN 'Moins de 30 m2'
            WHEN h.living_area < 50                   THEN '30-49 m2'
            WHEN h.living_area < 80                   THEN '50-79 m2'
            WHEN h.living_area < 120                  THEN '80-119 m2'
            ELSE '120 m2 et plus'
        END                                 AS living_area_category,
        -- Derived: building age category (ref 2026)
        CASE
            WHEN h.building_year IS NULL              THEN NULL
            WHEN h.building_year < 1919               THEN 'Avant 1919'
            WHEN h.building_year < 1946               THEN '1919-1945'
            WHEN h.building_year < 1971               THEN '1946-1970'
            WHEN h.building_year < 1991               THEN '1971-1990'
            WHEN h.building_year < 2006               THEN '1991-2005'
            ELSE 'Après 2005'
        END                                 AS building_age_category,
        -- Derived: DPE/energy category
        CASE
            WHEN h.energy_consumption_bdnb IS NULL    THEN NULL
            WHEN h.energy_consumption_bdnb IN ('A','B','C') THEN 'Performant'
            WHEN h.energy_consumption_bdnb = 'D'      THEN 'Moyen'
            WHEN h.energy_consumption_bdnb IN ('E')   THEN 'Passoire (E)'
            WHEN h.energy_consumption_bdnb IN ('F','G') THEN 'Passoire (F-G)'
            ELSE 'Inconnu'
        END                                 AS energy_consumption_category,
        h.energy_consumption_bdnb IN ('F','G')
                                            AS is_energy_sieve,
        -- Derived: cadastral classification label
        CASE h.cadastral_classification
            WHEN 1 THEN 'Grand luxe'
            WHEN 2 THEN 'Luxe'
            WHEN 3 THEN 'Très bon'
            WHEN 4 THEN 'Bon'
            WHEN 5 THEN 'Assez bon'
            WHEN 6 THEN 'Ordinaire'
            WHEN 7 THEN 'Médiocre'
            WHEN 8 THEN 'Très médiocre'
            ELSE NULL
        END                                 AS cadastral_classification_label
    FROM {{ ref('int_production_housing') }} h
),

-- Owner profile (rank=1 only)
owner_features AS (
    SELECT * FROM {{ ref('int_analysis_housing_owners') }}
),

-- Commune-level features (fiscal + market + density + TLV)
city_features AS (
    SELECT * FROM {{ ref('int_analysis_city_features') }}
),

-- DVG/DVF: commune-level sales dynamism (superset already in city_features,
-- kept as an explicit alias for the documented "DVF sales" family)
dvg_features AS (
    SELECT
        geo_code,
        total_transactions_2019_2024,
        avg_annual_transactions,
        evolution_prix_m2_2019_2023_pct,
        marche_dynamisme
    FROM {{ ref('int_analysis_dvg_wide') }}
),

-- Prices: commune-level price/volume series
prix_features AS (
    SELECT
        geo_code,
        evolution_prix_maisons_2019_2023_pct,
        evolution_prix_appartements_2019_2023_pct,
        total_mutations_maisons_2019_2024,
        total_mutations_appartements_2019_2024
    FROM {{ ref('int_analysis_prix_volumes_wide') }}
),

-- Rents: DGALN loyers 2025 (join on geo_code)
rents_features AS (
    SELECT
        geo_code,
        loyer_predit_m2_appartements,
        loyer_predit_m2_maisons,
        type_prediction_appartements,
        type_prediction_maisons
    FROM {{ ref('stg_external_dgaln_loyers_2025') }}
),

-- Density: INSEE features (join on geo_code)
density_features AS (
    SELECT
        geo_code,
        densite_grid,
        densite_category,
        population_2022,
        population_growth_rate_2019_2022,
        is_population_declining
    FROM {{ ref('int_analysis_insee_features') }}
),

-- Dispositifs: OPAH, ORT, ACV, PVD, TLV via marts_common_cities (join on city_code)
dispositifs_features AS (
    SELECT
        city_code,
        tlv1,
        tlv2,
        action_coeur_de_ville,
        action_coeur_de_ville_1,
        petite_ville_de_demain,
        village_davenir,
        opah,
        type_opah,
        pig,
        ort_signed,
        ort_signed_at,
        epci_code,
        epci_name
    FROM {{ ref('marts_common_cities') }}
),

-- Campaign / ZLV pro-activity: housing-level ZLV engagement
zlv_features AS (
    SELECT
        housing_id,
        was_contacted_by_zlv,
        contact_count,
        contact_intensity,
        total_campaigns_received,
        has_status_update,
        has_occupancy_update,
        has_any_update,
        update_intensity,
        zlv_engagement_score,
        zlv_engagement_category,
        -- Establishment pro-activity
        kind_pro_activity_quantile,
        kind_pro_activity_ntile,
        total_pro_activity_score,
        pro_activity_level,
        activation_level,
        typologie_activation_simple,
        is_on_user_territory
    FROM {{ ref('int_analysis_housing_zlv_usage') }}
),

-- Geo hierarchy: commune → EPCI → département → région
geo_hierarchy AS (
    SELECT
        geo_code,
        com_name,
        epci_siren,
        epci_name,
        dep_siren,
        dep_name,
        reg_siren,
        reg_name
    FROM {{ ref('int_common_com_epci_dep_region') }}
),

-- =====================================================
-- SPINE JOIN: LEFT JOIN every feature family
-- =====================================================
final AS (
    SELECT
        -- ---- PRIMARY KEY + COHORT FLAGS ----
        c.housing_id,
        c.geo_code,
        cm.city_code,

        -- ---- TARGET VARIABLE ----
        c.is_housing_out,
        c.vacancy_status_label,

        -- ---- DURATION / TEMPORAL ----
        c.vacancy_start_year,
        c.years_in_vacancy,
        c.vacancy_duration_category,
        c.lovac_years_present,

        -- ---- MORPHOLOGY ----
        hf.housing_kind,
        hf.rooms_count,
        hf.living_area,
        hf.living_area_category,
        hf.building_year,
        hf.building_age_category,
        hf.uncomfortable,
        hf.cadastral_classification,
        hf.cadastral_classification_label,
        hf.rental_value,
        hf.beneficiary_count,
        hf.condominium,
        -- missing flags for sparse morphology columns
        hf.housing_kind IS NULL             AS housing_kind_is_missing,
        hf.rooms_count IS NULL              AS rooms_count_is_missing,
        hf.living_area IS NULL              AS living_area_is_missing,
        hf.building_year IS NULL            AS building_year_is_missing,
        hf.cadastral_classification IS NULL AS cadastral_classification_is_missing,

        -- ---- ENERGY / DPE ----
        hf.energy_consumption_bdnb,
        hf.energy_consumption_at_bdnb,
        hf.actual_dpe,
        hf.energy_consumption_category,
        hf.is_energy_sieve,
        hf.energy_consumption_bdnb IS NULL  AS energy_consumption_is_missing,

        -- ---- OWNER PROFILE ----
        of_.owner_kind_class,
        of_.owner_is_individual,
        of_.owner_is_sci,
        of_.owner_is_company,
        of_.owner_is_indivision,
        of_.owner_age,
        of_.owner_age_category,
        of_.owner_generation,
        of_.owner_location_relative_label,
        of_.owner_is_local,
        of_.owner_is_distant,
        of_.owner_distance_km,
        of_.owner_distance_category,
        of_.property_right,
        of_.property_right_category,
        of_.owner_is_full_owner,
        of_.owner_housing_count,
        of_.owner_is_multi_owner,
        of_.owner_portfolio_category,
        of_.owner_contactable,
        -- missing flags
        of_.owner_kind_class IS NULL        AS owner_kind_is_missing,
        of_.owner_age IS NULL               AS owner_age_is_missing,
        of_.owner_distance_km IS NULL       AS owner_distance_is_missing,

        -- ---- FISCAL (via city_features) ----
        cf.taux_tfb_2024,
        cf.taux_tfnb_2024,
        cf.taux_th_2024,
        cf.teom_taux_2024,
        cf.pression_fiscale_tfb_teom_2024,
        cf.th_surtaxe_residences_secondaires_pct,
        cf.taux_tfb_quartile,
        cf.taux_tfnb_quartile,
        cf.taux_teom_quartile,
        cf.taux_th_quartile,
        cf.evolution_taux_tfb_2021_2024_pct,
        -- missing flag
        cf.taux_tfb_2024 IS NULL            AS fiscal_is_missing,

        -- ---- DVF SALES DYNAMISM ----
        dv.total_transactions_2019_2024     AS dvf_total_transactions,
        dv.avg_annual_transactions          AS dvf_avg_annual_transactions,
        dv.evolution_prix_m2_2019_2023_pct  AS dvf_evolution_prix_m2_pct,
        dv.marche_dynamisme                 AS dvf_marche_dynamisme,
        dv.total_transactions_2019_2024 IS NULL AS dvf_is_missing,

        -- ---- PRICES (CEREMA) ----
        pf.evolution_prix_maisons_2019_2023_pct,
        pf.evolution_prix_appartements_2019_2023_pct,
        pf.total_mutations_maisons_2019_2024,
        pf.total_mutations_appartements_2019_2024,
        pf.evolution_prix_maisons_2019_2023_pct IS NULL AS prix_is_missing,

        -- ---- RENTS (DGALN loyers) ----
        rf.loyer_predit_m2_appartements,
        rf.loyer_predit_m2_maisons,
        rf.type_prediction_appartements,
        rf.type_prediction_maisons,
        rf.loyer_predit_m2_appartements IS NULL AS loyer_is_missing,

        -- ---- DENSITY (INSEE) ----
        df.densite_grid,
        df.densite_category,
        df.population_2022,
        df.population_growth_rate_2019_2022,
        df.is_population_declining,
        df.densite_grid IS NULL             AS densite_is_missing,

        -- ---- DISPOSITIFS ----
        disp.tlv1,
        disp.tlv2,
        disp.action_coeur_de_ville,
        disp.action_coeur_de_ville_1,
        disp.petite_ville_de_demain,
        disp.village_davenir,
        disp.opah,
        disp.type_opah,
        disp.pig,
        disp.ort_signed,
        disp.ort_signed_at,
        -- combined special territory flag
        (
            COALESCE(disp.opah, FALSE) OR
            COALESCE(disp.action_coeur_de_ville, FALSE) OR
            COALESCE(disp.petite_ville_de_demain, FALSE) OR
            COALESCE(disp.ort_signed, FALSE) OR
            COALESCE(disp.pig, FALSE) OR
            COALESCE(disp.village_davenir, FALSE)
        )                                   AS has_any_special_territory,
        -- TLV from city_features (canonical — includes 2026 update)
        cf.is_in_tlv_territory,
        cf.years_in_tlv,
        cf.is_in_thlv_territory,
        disp.city_code IS NULL              AS dispositif_is_missing,

        -- ---- CAMPAIGNS / PRO-ACTIVITY ----
        zlv.was_contacted_by_zlv,
        zlv.contact_count,
        zlv.contact_intensity,
        zlv.total_campaigns_received,
        zlv.has_status_update,
        zlv.has_occupancy_update,
        zlv.has_any_update,
        zlv.update_intensity,
        zlv.zlv_engagement_score,
        zlv.zlv_engagement_category,
        zlv.kind_pro_activity_quantile,
        zlv.kind_pro_activity_ntile,
        zlv.total_pro_activity_score,
        zlv.pro_activity_level,
        zlv.activation_level,
        zlv.typologie_activation_simple,
        zlv.is_on_user_territory,
        zlv.was_contacted_by_zlv IS NULL    AS zlv_is_missing,

        -- ---- GEO HIERARCHY ----
        gh.com_name                         AS commune_name,
        gh.epci_siren,
        gh.epci_name                        AS epci_name_hierarchy,
        gh.dep_siren,
        gh.dep_name                         AS department_name,
        gh.reg_siren,
        gh.reg_name                         AS region_name,
        gh.dep_name IS NULL                 AS geo_hierarchy_is_missing

    FROM cohort c
    -- city mapping (to get city_code for dispositifs join)
    LEFT JOIN city_mapping cm
        ON c.geo_code = cm.geo_code
    -- housing morphology + energy
    LEFT JOIN housing_features hf
        ON CAST(c.housing_id AS UUID) = CAST(hf.housing_id AS UUID)
    -- owner profile
    LEFT JOIN owner_features of_
        ON c.housing_id = CAST(of_.housing_id AS VARCHAR)
    -- city features (fiscal + market + density + TLV)
    LEFT JOIN city_features cf
        ON c.geo_code = cf.geo_code
    -- DVF/DVG sales
    LEFT JOIN dvg_features dv
        ON c.geo_code = dv.geo_code
    -- CEREMA prices
    LEFT JOIN prix_features pf
        ON c.geo_code = pf.geo_code
    -- DGALN rents
    LEFT JOIN rents_features rf
        ON c.geo_code = rf.geo_code
    -- INSEE density
    LEFT JOIN density_features df
        ON c.geo_code = df.geo_code
    -- dispositifs (uses city_code from city_mapping above)
    LEFT JOIN dispositifs_features disp
        ON cm.city_code = disp.city_code
    -- ZLV campaign/pro-activity
    LEFT JOIN zlv_features zlv
        ON c.housing_id = CAST(zlv.housing_id AS VARCHAR)
    -- geo hierarchy
    LEFT JOIN geo_hierarchy gh
        ON c.geo_code = gh.geo_code
)

SELECT * FROM final
