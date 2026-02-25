{{
config (
    materialized = 'table',
    unique_key = 'establishment_id',
)
}}

-- Marts: Establishment-level ZLV usage metrics
-- Pure establishment-level table for BI reporting
-- Wraps int_analysis_establishments_zlv_usage and adds "Echelons inscrits" computations
-- Grain: one row per establishment

WITH establishment_metrics AS (
    SELECT * FROM {{ ref('int_analysis_establishments_zlv_usage') }}
),

-- Get kind and additional fields not in the intermediate
establishment_extra AS (
    SELECT
        CAST(pe.establishment_id AS VARCHAR) AS establishment_id,
        pe.kind,
        pe.establishment_kind_label,
        COALESCE(pe.contacted_housing_2024, 0) AS contacted_housing_2024,
        COALESCE(pe.contacted_housing_2023, 0) AS contacted_housing_2023,
        COALESCE(pe.user_number, 0) AS establishment_user_count
    FROM {{ ref('marts_production_establishments') }} pe
),

-- Count total communes per establishment territory
establishment_commune_counts AS (
    SELECT
        CAST(el.establishment_id AS VARCHAR) AS establishment_id,
        COUNT(DISTINCT el.geo_code) AS total_communes_territoire
    FROM {{ ref('int_production_establishments_localities') }} el
    GROUP BY el.establishment_id
),

-- Identify geo_codes with a Commune-type ZLV establishment registered
geo_codes_with_commune_inscrite AS (
    SELECT DISTINCT geo_code
    FROM {{ ref('int_production_geo_code_establishments') }}
    WHERE inscrit_zlv_direct = TRUE
),

-- For each establishment, count inscribed member communes
communes_inscrites_per_establishment AS (
    SELECT
        CAST(el.establishment_id AS VARCHAR) AS establishment_id,
        COUNT(DISTINCT CASE WHEN ci.geo_code IS NOT NULL THEN el.geo_code END) AS communes_inscrites
    FROM {{ ref('int_production_establishments_localities') }} el
    LEFT JOIN geo_codes_with_commune_inscrite ci ON el.geo_code = ci.geo_code
    GROUP BY el.establishment_id
)

SELECT
    em.establishment_id,

    -- =====================================================
    -- DIMENSIONS
    -- =====================================================
    em.nom,
    em.ouvert,
    em.date_ouverture,
    em.annee_ouverture,
    ee.kind,
    ee.establishment_kind_label,

    -- =====================================================
    -- UTILISATEURS / CONNEXIONS
    -- =====================================================
    em.utilisateurs_inscrits,
    em.date_derniere_connexion,
    em.connecte_30_jours,
    em.connecte_60_jours,
    em.connecte_90_jours,
    em.connexions_30_jours,
    em.connexions_60_jours,
    em.connexions_90_jours,

    -- =====================================================
    -- LOGEMENTS MIS A JOUR - SITUATION
    -- =====================================================
    em.a_1_logement_maj_situation,
    em.a_1_logement_maj_occupation,
    em.a_1_logement_maj_suivi,
    em.logements_maj_situation,
    em.logements_maj_occupation,
    em.logements_maj_suivi,
    em.logements_maj_non_suivi,
    em.logements_maj_en_attente,
    em.logements_maj_premier_contact,
    em.logements_maj_suivi_en_cours,
    em.logements_maj_suivi_termine,
    em.logements_maj_suivi_termine_sortis,
    em.logements_maj_suivi_termine_fiabilises,
    em.logements_maj_bloque,
    em.date_premiere_maj_situation,
    em.date_derniere_maj_situation,
    em.logements_maj_situation_pct_parc_vacant_25,
    em.logements_maj_situation_pct_parc_locatif_24,

    -- =====================================================
    -- LOGEMENTS MIS A JOUR - ENRICHISSEMENT
    -- =====================================================
    em.a_1_logement_maj_enrichissement,
    em.logements_maj_enrichissement,
    em.logements_maj_mails,
    em.logements_maj_phone,
    em.logements_maj_owners,
    em.logements_maj_owners_address,
    em.logements_maj_dpe,
    em.logements_maj_notes,
    em.logements_maj_documents,
    em.date_premiere_maj_enrichissement,
    em.date_derniere_maj_enrichissement,

    -- =====================================================
    -- DOCUMENTS
    -- =====================================================
    em.documents_importes,
    em.date_dernier_document_importe,

    -- =====================================================
    -- GROUPES
    -- =====================================================
    em.a_1_groupe_cree,
    em.logements_exportes_via_groupes,
    em.groupes_exportes,
    em.groupes_crees,
    em.date_dernier_groupe_cree,

    -- =====================================================
    -- CAMPAGNES
    -- =====================================================
    em.logements_contactes_via_campagnes,
    em.a_1_campagne_envoyee_et_1_maj_situation,
    em.a_1_campagne_creee,
    em.a_1_campagne_creee_30_jours,
    em.a_1_campagne_envoyee,
    em.campagnes_envoyees,
    em.campagnes_exportees,
    em.campagnes_creees,
    em.date_premiere_campagne_creee,
    em.date_derniere_campagne_creee,

    -- =====================================================
    -- PERIMETRES
    -- =====================================================
    em.a_1_perimetre_importe,
    em.perimetres_importes,
    em.couches_perimetres_importes,

    -- =====================================================
    -- REFERENTS COMPARATIFS
    -- =====================================================
    em.region,
    em.departement,
    em.type_detaille,
    em.type_simple,

    -- =====================================================
    -- PRISE DE CONTACT
    -- =====================================================
    em.mails_utilisateurs,

    -- =====================================================
    -- ACTIVATION / PRO-ACTIVITY
    -- =====================================================
    em.connecte_90_derniers_jours,
    em.connecte_60_derniers_jours,
    em.connecte_30_derniers_jours,
    em.a_depose_1_perimetre,
    em.a_cree_1_groupe,
    em.a_cree_1_campagne,
    em.a_envoye_1_campagne,
    em.a_fait_1_maj_suivi,
    em.a_fait_1_maj_occupation,
    em.a_fait_1_maj,
    em.a_fait_1_campagne_ET_1_maj,
    em.typologie_activation_simple,
    em.typologie_activation_detaillee,
    em.activation_level,
    em.kind_pro_activity_quantile,
    em.kind_pro_activity_ntile,
    em.total_pro_activity_score,
    em.pro_activity_level,
    em.housing_rate_contacted_2024,
    em.housing_vacant_rate_contacted_2024,
    ee.contacted_housing_2024,
    ee.contacted_housing_2023,
    ee.establishment_user_count,

    -- =====================================================
    -- ECHELONS INSCRITS
    -- =====================================================
    CASE
        WHEN em.type_simple = 'Intercommunalité'
        THEN COALESCE(cipe.communes_inscrites, 0)
        ELSE NULL
    END AS communes_inscrites,
    CASE
        WHEN em.type_simple = 'Intercommunalité' AND COALESCE(ecc.total_communes_territoire, 0) > 0
        THEN ROUND(COALESCE(cipe.communes_inscrites, 0)::FLOAT / ecc.total_communes_territoire * 100, 2)
        ELSE NULL
    END AS communes_inscrites_pct,
    CAST(NULL AS INTEGER) AS intercommunalites_inscrites,
    CAST(NULL AS FLOAT) AS intercommunalites_inscrites_pct,
    CAST(NULL AS INTEGER) AS departements_inscrits,
    CAST(NULL AS FLOAT) AS departements_inscrits_pct,
    CAST(NULL AS INTEGER) AS sded_inscrits,
    CAST(NULL AS FLOAT) AS sded_inscrits_pct

FROM establishment_metrics em
LEFT JOIN establishment_extra ee ON em.establishment_id = ee.establishment_id
LEFT JOIN establishment_commune_counts ecc ON em.establishment_id = ecc.establishment_id
LEFT JOIN communes_inscrites_per_establishment cipe ON em.establishment_id = cipe.establishment_id
