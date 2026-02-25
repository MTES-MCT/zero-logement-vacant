{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: ZLV application usage and establishment activity at housing level
-- Contains housing-level contact/status data + establishment-level metrics from EPCI mapping
-- MAPPING: Housing geo_code -> EPCI/CA/CC/ME establishment via int_production_establishments_localities
-- Establishment metrics sourced from marts_zlv_usage

WITH housing_out AS (
    SELECT
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

housing_zlv AS (
    SELECT * FROM {{ ref('int_analysis_housing_zlv_usage') }}
),

-- Map geo_code to EPCI/CA/CC/ME establishment (one per commune)
geo_code_to_epci AS (
    SELECT
        el.geo_code,
        CAST(el.establishment_id AS VARCHAR) AS establishment_id
    FROM {{ ref('int_production_establishments_localities') }} el
    JOIN {{ ref('int_production_establishments') }} est ON el.establishment_id = est.id
    WHERE est.kind IN ('CC', 'CU', 'ME', 'CA')
    QUALIFY ROW_NUMBER() OVER (PARTITION BY el.geo_code ORDER BY est.kind) = 1
),

establishment_metrics AS (
    SELECT * FROM {{ ref('marts_zlv_usage') }}
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    CAST(ho.housing_id AS VARCHAR) AS housing_id,
    epci.establishment_id,
    COALESCE(hz.establishment_count, 0) AS establishment_count,

    -- =====================================================
    -- HOUSING CONTACT STATUS
    -- =====================================================
    COALESCE(hz.was_contacted_by_zlv, FALSE) AS was_contacted_by_zlv,
    COALESCE(hz.contact_count, 0) AS contact_count,
    COALESCE(hz.contact_intensity, 'Non contacte') AS contact_intensity,
    hz.first_contact_date,
    hz.last_contact_date,
    hz.days_since_first_contact,
    hz.days_since_last_contact,
    COALESCE(hz.contact_recency_category, 'Jamais contacte') AS contact_recency_category,

    -- =====================================================
    -- CAMPAIGN DETAILS
    -- =====================================================
    hz.first_campaign_created,
    hz.last_campaign_created,
    hz.first_campaign_sent_date,
    hz.last_campaign_sent_date,
    COALESCE(hz.total_campaigns_validated, 0) AS total_campaigns_validated,
    COALESCE(hz.total_campaigns_confirmed, 0) AS total_campaigns_confirmed,
    COALESCE(hz.total_campaigns_received, 0) AS total_campaigns_received,
    COALESCE(hz.total_campaigns_sent, 0) AS total_campaigns_sent,
    COALESCE(hz.has_received_campaign, FALSE) AS has_received_campaign,

    -- =====================================================
    -- GROUP DETAILS
    -- =====================================================
    COALESCE(hz.total_groups, 0) AS total_groups,
    hz.group_titles,
    hz.first_group_created,
    hz.last_group_created,
    hz.first_group_exported,
    hz.last_group_exported,
    COALESCE(hz.is_in_group, FALSE) AS is_in_group,
    COALESCE(hz.group_intensity, 'Aucun groupe') AS group_intensity,
    COALESCE(hz.was_exported_from_group, FALSE) AS was_exported_from_group,

    -- =====================================================
    -- STATUS UPDATES - FOLLOWUP (SUIVI)
    -- =====================================================
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

    -- =====================================================
    -- STATUS UPDATES - OCCUPANCY
    -- =====================================================
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

    -- =====================================================
    -- COMBINED STATUS UPDATE INDICATORS
    -- =====================================================
    COALESCE(hz.has_any_update, FALSE) AS has_any_update,
    COALESCE(hz.update_intensity, 'Aucune MAJ') AS update_intensity,
    hz.days_since_last_followup_update,
    hz.days_since_last_occupancy_update,

    -- =====================================================
    -- USER TERRITORY COVERAGE
    -- =====================================================
    COALESCE(hz.is_on_user_territory, FALSE) AS is_on_user_territory,

    -- =====================================================
    -- ESTABLISHMENT INFO (from EPCI -> marts_zlv_usage)
    -- =====================================================
    em.nom AS establishment_name,
    em.kind AS establishment_kind,
    em.establishment_kind_label,
    em.type_simple AS establishment_type_regroupe,

    -- =====================================================
    -- ESTABLISHMENT ACTIVATION (from EPCI)
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
    COALESCE(em.activation_level, 0) AS activation_level,

    -- =====================================================
    -- ESTABLISHMENT PRO-ACTIVITY (from EPCI)
    -- =====================================================
    em.kind_pro_activity_quantile,
    em.kind_pro_activity_ntile,
    COALESCE(em.total_pro_activity_score, 0) AS total_pro_activity_score,
    COALESCE(em.pro_activity_level, 0) AS pro_activity_level,

    -- =====================================================
    -- ESTABLISHMENT METRICS (from EPCI)
    -- =====================================================
    COALESCE(em.campagnes_envoyees, 0) AS total_campaigns_sent_establishment,
    COALESCE(em.contacted_housing_2024, 0) AS housing_contacted_2024,
    COALESCE(em.contacted_housing_2023, 0) AS housing_contacted_2023,
    em.housing_rate_contacted_2024,
    COALESCE(em.establishment_user_count, 0) AS establishment_user_count,
    CASE WHEN COALESCE(em.establishment_user_count, 0) > 0 THEN TRUE ELSE FALSE END AS establishment_has_active_users,

    -- =====================================================
    -- COMPOSITE ZLV ENGAGEMENT (recomputed with EPCI data)
    -- =====================================================
    (
        CASE WHEN COALESCE(hz.total_campaigns_sent, 0) > 0 THEN 3 ELSE 0 END +
        CASE WHEN COALESCE(hz.total_groups, 0) > 0 THEN 1 ELSE 0 END +
        CASE
            WHEN em.typologie_activation_simple LIKE '(4)%' OR em.typologie_activation_simple LIKE '(5)%' THEN 3
            WHEN em.typologie_activation_simple LIKE '(3)%' THEN 2
            WHEN em.typologie_activation_simple LIKE '(2)%' THEN 1
            ELSE 0
        END +
        CASE
            WHEN em.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
            WHEN em.kind_pro_activity_ntile = 'Pro-actif' THEN 2
            WHEN em.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
            ELSE 0
        END
    ) AS zlv_engagement_score,

    CASE
        WHEN (
            CASE WHEN COALESCE(hz.total_campaigns_sent, 0) > 0 THEN 3 ELSE 0 END +
            CASE WHEN COALESCE(hz.total_groups, 0) > 0 THEN 1 ELSE 0 END +
            CASE
                WHEN em.typologie_activation_simple LIKE '(4)%' OR em.typologie_activation_simple LIKE '(5)%' THEN 3
                WHEN em.typologie_activation_simple LIKE '(3)%' THEN 2
                WHEN em.typologie_activation_simple LIKE '(2)%' THEN 1
                ELSE 0
            END +
            CASE
                WHEN em.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                WHEN em.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                WHEN em.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                ELSE 0
            END
        ) = 0 THEN 'Aucun engagement'
        WHEN (
            CASE WHEN COALESCE(hz.total_campaigns_sent, 0) > 0 THEN 3 ELSE 0 END +
            CASE WHEN COALESCE(hz.total_groups, 0) > 0 THEN 1 ELSE 0 END +
            CASE
                WHEN em.typologie_activation_simple LIKE '(4)%' OR em.typologie_activation_simple LIKE '(5)%' THEN 3
                WHEN em.typologie_activation_simple LIKE '(3)%' THEN 2
                WHEN em.typologie_activation_simple LIKE '(2)%' THEN 1
                ELSE 0
            END +
            CASE
                WHEN em.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                WHEN em.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                WHEN em.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                ELSE 0
            END
        ) <= 3 THEN 'Engagement faible'
        WHEN (
            CASE WHEN COALESCE(hz.total_campaigns_sent, 0) > 0 THEN 3 ELSE 0 END +
            CASE WHEN COALESCE(hz.total_groups, 0) > 0 THEN 1 ELSE 0 END +
            CASE
                WHEN em.typologie_activation_simple LIKE '(4)%' OR em.typologie_activation_simple LIKE '(5)%' THEN 3
                WHEN em.typologie_activation_simple LIKE '(3)%' THEN 2
                WHEN em.typologie_activation_simple LIKE '(2)%' THEN 1
                ELSE 0
            END +
            CASE
                WHEN em.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                WHEN em.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                WHEN em.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                ELSE 0
            END
        ) <= 6 THEN 'Engagement moyen'
        ELSE 'Engagement fort'
    END AS zlv_engagement_category,

    -- =====================================================
    -- ESTABLISHMENT DIMENSIONS (from marts_zlv_usage)
    -- =====================================================
    em.nom AS establishment_nom,
    COALESCE(em.ouvert, FALSE) AS establishment_ouvert,
    em.date_ouverture AS establishment_date_ouverture,
    em.annee_ouverture AS establishment_annee_ouverture,

    -- =====================================================
    -- ESTABLISHMENT UTILISATEURS / CONNEXIONS
    -- =====================================================
    COALESCE(em.utilisateurs_inscrits, 0) AS establishment_utilisateurs_inscrits,
    em.date_derniere_connexion AS establishment_date_derniere_connexion,
    COALESCE(em.connecte_30_jours, FALSE) AS establishment_connecte_30_jours,
    COALESCE(em.connecte_60_jours, FALSE) AS establishment_connecte_60_jours,
    COALESCE(em.connecte_90_jours, FALSE) AS establishment_connecte_90_jours,
    COALESCE(em.connexions_30_jours, 0) AS establishment_connexions_30_jours,
    COALESCE(em.connexions_60_jours, 0) AS establishment_connexions_60_jours,
    COALESCE(em.connexions_90_jours, 0) AS establishment_connexions_90_jours,

    -- =====================================================
    -- ESTABLISHMENT LOGEMENTS MAJ SITUATION
    -- =====================================================
    COALESCE(em.a_1_logement_maj_situation, FALSE) AS establishment_a_1_logement_maj_situation,
    COALESCE(em.a_1_logement_maj_occupation, FALSE) AS establishment_a_1_logement_maj_occupation,
    COALESCE(em.a_1_logement_maj_suivi, FALSE) AS establishment_a_1_logement_maj_suivi,
    COALESCE(em.logements_maj_situation, 0) AS establishment_logements_maj_situation,
    COALESCE(em.logements_maj_occupation, 0) AS establishment_logements_maj_occupation,
    COALESCE(em.logements_maj_suivi, 0) AS establishment_logements_maj_suivi,
    COALESCE(em.logements_maj_non_suivi, 0) AS establishment_logements_maj_non_suivi,
    COALESCE(em.logements_maj_en_attente, 0) AS establishment_logements_maj_en_attente,
    COALESCE(em.logements_maj_premier_contact, 0) AS establishment_logements_maj_premier_contact,
    COALESCE(em.logements_maj_suivi_en_cours, 0) AS establishment_logements_maj_suivi_en_cours,
    COALESCE(em.logements_maj_suivi_termine, 0) AS establishment_logements_maj_suivi_termine,
    COALESCE(em.logements_maj_suivi_termine_sortis, 0) AS establishment_logements_maj_suivi_termine_sortis,
    COALESCE(em.logements_maj_suivi_termine_fiabilises, 0) AS establishment_logements_maj_suivi_termine_fiabilises,
    COALESCE(em.logements_maj_bloque, 0) AS establishment_logements_maj_bloque,
    em.date_premiere_maj_situation AS establishment_date_premiere_maj_situation,
    em.date_derniere_maj_situation AS establishment_date_derniere_maj_situation,
    em.logements_maj_situation_pct_parc_vacant_25 AS establishment_logements_maj_situation_pct_parc_vacant_25,
    em.logements_maj_situation_pct_parc_locatif_24 AS establishment_logements_maj_situation_pct_parc_locatif_24,

    -- =====================================================
    -- ESTABLISHMENT LOGEMENTS MAJ ENRICHISSEMENT
    -- =====================================================
    COALESCE(em.a_1_logement_maj_enrichissement, FALSE) AS establishment_a_1_logement_maj_enrichissement,
    COALESCE(em.logements_maj_enrichissement, 0) AS establishment_logements_maj_enrichissement,
    COALESCE(em.logements_maj_mails, 0) AS establishment_logements_maj_mails,
    COALESCE(em.logements_maj_phone, 0) AS establishment_logements_maj_phone,
    COALESCE(em.logements_maj_owners, 0) AS establishment_logements_maj_owners,
    COALESCE(em.logements_maj_owners_address, 0) AS establishment_logements_maj_owners_address,
    em.logements_maj_dpe AS establishment_logements_maj_dpe,
    COALESCE(em.logements_maj_notes, 0) AS establishment_logements_maj_notes,
    COALESCE(em.logements_maj_documents, 0) AS establishment_logements_maj_documents,
    em.date_premiere_maj_enrichissement AS establishment_date_premiere_maj_enrichissement,
    em.date_derniere_maj_enrichissement AS establishment_date_derniere_maj_enrichissement,

    -- =====================================================
    -- ESTABLISHMENT DOCUMENTS
    -- =====================================================
    COALESCE(em.documents_importes, 0) AS establishment_documents_importes,
    em.date_dernier_document_importe AS establishment_date_dernier_document_importe,

    -- =====================================================
    -- ESTABLISHMENT GROUPES
    -- =====================================================
    COALESCE(em.a_1_groupe_cree, FALSE) AS establishment_a_1_groupe_cree,
    COALESCE(em.logements_exportes_via_groupes, 0) AS establishment_logements_exportes_via_groupes,
    COALESCE(em.groupes_exportes, 0) AS establishment_groupes_exportes,
    COALESCE(em.groupes_crees, 0) AS establishment_groupes_crees,
    em.date_dernier_groupe_cree AS establishment_date_dernier_groupe_cree,

    -- =====================================================
    -- ESTABLISHMENT CAMPAGNES
    -- =====================================================
    COALESCE(em.logements_contactes_via_campagnes, 0) AS establishment_logements_contactes_via_campagnes,
    COALESCE(em.a_1_campagne_envoyee_et_1_maj_situation, FALSE) AS establishment_a_1_campagne_envoyee_et_1_maj_situation,
    COALESCE(em.a_1_campagne_creee, FALSE) AS establishment_a_1_campagne_creee,
    COALESCE(em.a_1_campagne_creee_30_jours, FALSE) AS establishment_a_1_campagne_creee_30_jours,
    COALESCE(em.a_1_campagne_envoyee, FALSE) AS establishment_a_1_campagne_envoyee,
    COALESCE(em.campagnes_envoyees, 0) AS establishment_campagnes_envoyees,
    COALESCE(em.campagnes_exportees, 0) AS establishment_campagnes_exportees,
    COALESCE(em.campagnes_creees, 0) AS establishment_campagnes_creees,
    em.date_premiere_campagne_creee AS establishment_date_premiere_campagne_creee,
    em.date_derniere_campagne_creee AS establishment_date_derniere_campagne_creee,

    -- =====================================================
    -- ESTABLISHMENT PERIMETRES
    -- =====================================================
    COALESCE(em.a_1_perimetre_importe, FALSE) AS establishment_a_1_perimetre_importe,
    COALESCE(em.perimetres_importes, 0) AS establishment_perimetres_importes,
    COALESCE(em.couches_perimetres_importes, 0) AS establishment_couches_perimetres_importes,

    -- =====================================================
    -- ESTABLISHMENT REFERENTS COMPARATIFS
    -- =====================================================
    em.region AS establishment_region,
    em.departement AS establishment_departement,
    em.type_detaille AS establishment_type_detaille,
    em.type_simple AS establishment_type_simple,

    -- =====================================================
    -- ESTABLISHMENT PRISE DE CONTACT
    -- =====================================================
    em.mails_utilisateurs AS establishment_mails_utilisateurs

FROM housing_out ho
LEFT JOIN housing_zlv hz ON ho.housing_id = hz.housing_id
LEFT JOIN geo_code_to_epci epci ON ho.geo_code = epci.geo_code
LEFT JOIN establishment_metrics em ON epci.establishment_id = em.establishment_id
