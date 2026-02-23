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

loyers_2025 AS (
    SELECT * FROM {{ ref('stg_external_dgaln_loyers_2025') }}
),

fiscalite_2024 AS (
    SELECT * FROM {{ ref('stg_external_dgfip_fiscalite_locale') }}
    WHERE annee_reference = 2024
),

fiscalite_2021 AS (
    SELECT * FROM {{ ref('stg_external_dgfip_fiscalite_locale') }}
    WHERE annee_reference = 2021
),

zonage_abc AS (
    SELECT * FROM {{ ref('stg_external_dgaln_zonage_abc') }}
),

tlv AS (
    SELECT * FROM {{ ref('stg_external_dgfip_liste_communes_tlv') }}
),

delib AS (
    SELECT * FROM {{ ref('stg_external_dgfip_deliberation_fiscalite_locale_communes') }}
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
    i.densite_grid,
    i.densite_label,
    i.densite_category,
    i.densite_grid_7,
    i.densite_label_7,
    i.densite_aav_grid,
    i.densite_aav_label,
    i.pct_pop_urbain_dense,
    i.pct_pop_urbain_intermediaire,
    i.pct_pop_rural,
    i.population_2019,
    i.population_2020,
    i.population_2021,
    i.population_2022,
    i.population_growth_rate_2019_2022,
    i.population_growth_rate_annual,
    i.is_population_declining,
    
    -- =====================================================
    -- DGALN LOYERS 2025
    -- =====================================================
    l25.loyer_predit_m2_appartements,
    l25.loyer_intervalle_bas_m2_appartements,
    l25.loyer_intervalle_haut_m2_appartements,
    l25.type_prediction_appartements,
    l25.nb_observations_commune_appartements,
    l25.nb_observations_maille_appartements,
    l25.r2_adjusted_appartements,
    
    l25.loyer_predit_m2_maisons,
    l25.loyer_intervalle_bas_m2_maisons,
    l25.loyer_intervalle_haut_m2_maisons,
    l25.type_prediction_maisons,
    l25.nb_observations_commune_maisons,
    l25.nb_observations_maille_maisons,
    l25.r2_adjusted_maisons,

    -- =====================================================
    -- DGALN ZONAGE ABC
    -- =====================================================
    z.zonage_en_vigueur,

    -- =====================================================
    -- CEREMA PRIX VOLUMES (selected years)
    -- =====================================================
    {% for year in years %}
    pv.prix_median_m2_maisons_{{ year }},
    pv.prix_q25_m2_maisons_{{ year }},
    pv.prix_q75_m2_maisons_{{ year }},
    pv.valeur_fonciere_totale_maisons_{{ year }},
    pv.nb_mutations_maisons_{{ year }},
    
    pv.prix_median_m2_appartements_{{ year }},
    pv.prix_q25_m2_appartements_{{ year }},
    pv.prix_q75_m2_appartements_{{ year }},
    pv.valeur_fonciere_totale_appartements_{{ year }},
    pv.nb_mutations_appartements_{{ year }},
    {% endfor %}
    
    pv.evolution_prix_maisons_2019_2023_pct,
    pv.evolution_prix_appartements_2019_2023_pct,
    pv.total_mutations_maisons_2019_2024,
    pv.total_mutations_appartements_2019_2024,
    
    -- =====================================================
    -- DVF TRANSACTIONS (Renamed from DVG)
    -- =====================================================
    {% for year in years %}
    d.nb_transactions_{{ year }} AS dvf_nb_transactions_{{ year }},
    d.prix_m2_moyen_{{ year }} AS dvf_prix_m2_moyen_{{ year }},
    {% endfor %}
    
    d.total_transactions_2019_2024 AS dvf_total_transactions_2019_2024,
    d.avg_annual_transactions AS dvf_avg_annual_transactions,
    d.evolution_prix_m2_2019_2023_pct AS dvf_evolution_prix_m2_2019_2023_pct,
    d.marche_dynamisme AS dvf_marche_dynamisme,
    
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
    -- 2024 Data
    f24.tfb_taux_global AS taux_tfb_2024,
    f24.tfb_taux_commune AS tfb_taux_commune_2024,
    f24.tfnb_taux_global AS taux_tfnb_2024,
    f24.th_taux_global AS taux_th_2024,
    f24.teom_taux AS teom_taux_2024,
    f24.th_surtaxe_indicateur,
    f24.th_surtaxe_residences_secondaires_pct,
    f24.pression_fiscale_tfb_teom AS pression_fiscale_tfb_teom_2024,
    f24.epci_regime_fiscal,
    f24.annee_reference AS fiscalite_annee_reference,

    -- Evolution 2021-2024
    CASE WHEN f21.tfb_taux_global > 0 THEN (f24.tfb_taux_global - f21.tfb_taux_global) / f21.tfb_taux_global * 100 END AS evolution_taux_tfb_2021_2024_pct,
    CASE WHEN f21.tfnb_taux_global > 0 THEN (f24.tfnb_taux_global - f21.tfnb_taux_global) / f21.tfnb_taux_global * 100 END AS evolution_taux_tfnb_2021_2024_pct,
    CASE WHEN f21.th_taux_global > 0 THEN (f24.th_taux_global - f21.th_taux_global) / f21.th_taux_global * 100 END AS evolution_taux_th_2021_2024_pct,
    CASE WHEN f21.teom_taux > 0 THEN (f24.teom_taux - f21.teom_taux) / f21.teom_taux * 100 END AS evolution_taux_teom_2021_2024_pct,

    -- Tax Distribution Categories (NTILE based classification)
    NTILE(4) OVER (ORDER BY f24.th_taux_global) AS taux_th_quartile,
    NTILE(4) OVER (ORDER BY f24.tfb_taux_global) AS taux_tfb_quartile,
    NTILE(4) OVER (ORDER BY f24.tfnb_taux_global) AS taux_tfnb_quartile,
    NTILE(4) OVER (ORDER BY f24.teom_taux) AS taux_teom_quartile,

    -- =====================================================
    -- TLV / THLV
    -- =====================================================
    tlv.tlv_2013,
    tlv.tlv_2023,
    tlv.tlv_2026,
    
    -- Years in TLV calculation
    CASE 
        WHEN tlv.tlv_2013 = 'TLV' THEN 13
        WHEN tlv.tlv_2023 LIKE '1.%' THEN 3
        WHEN tlv.tlv_2026 LIKE '1.%' THEN 1
        ELSE 0
    END AS years_in_tlv,

    -- Is in TLV Territory (2026 definition)
    CASE WHEN tlv.tlv_2026 LIKE '1.%' THEN TRUE ELSE FALSE END AS is_in_tlv_territory,

    -- THLV
    delib.date_thlv,
    delib.date_thlv IS NOT NULL AS is_in_thlv_territory

FROM insee i
LEFT JOIN prix_volumes pv ON i.geo_code = pv.geo_code
LEFT JOIN dvg d ON i.geo_code = d.geo_code
LEFT JOIN conso c ON i.geo_code = c.geo_code
LEFT JOIN loyers_2025 l25 ON i.geo_code = l25.geo_code
LEFT JOIN fiscalite_2024 f24 ON i.geo_code = f24.geo_code
LEFT JOIN fiscalite_2021 f21 ON i.geo_code = f21.geo_code
LEFT JOIN zonage_abc z ON i.geo_code = z.geo_code
LEFT JOIN tlv ON i.geo_code = tlv.geo_code
LEFT JOIN delib ON i.geo_code = delib.geo_code
