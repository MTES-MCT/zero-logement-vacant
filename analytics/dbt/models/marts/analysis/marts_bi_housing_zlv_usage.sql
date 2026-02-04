{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: ZLV application usage and establishment activity
-- Contains ZLV engagement metrics for vacancy exit analysis
-- Includes contact status, groups, campaigns, status updates, and establishment info
-- FILTER: Only includes housing with LOCAL collectivities (CC, CU, ME, CA, Commune)
-- Excludes departmental/regional establishments (SDED, SDER, DEP, REG) that cover entire territories

WITH housing_out AS (
    SELECT 
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

housing_zlv AS (
    -- Only include housing that has a local collectivity establishment
    SELECT * FROM {{ ref('int_analysis_housing_zlv_usage') }}
    WHERE establishment_kind IS NOT NULL
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    CAST(ho.housing_id AS VARCHAR) AS housing_id,
    hz.establishment_id,
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
    -- ESTABLISHMENT INFO
    -- =====================================================
    hz.establishment_name,
    hz.establishment_kind,
    hz.establishment_kind_label,
    hz.establishment_type_regroupe,
    
    -- =====================================================
    -- ESTABLISHMENT ACTIVATION
    -- =====================================================
    hz.connecte_90_derniers_jours,
    hz.connecte_60_derniers_jours,
    hz.connecte_30_derniers_jours,
    hz.a_depose_1_perimetre,
    hz.a_cree_1_groupe,
    hz.a_cree_1_campagne,
    hz.a_envoye_1_campagne,
    hz.a_fait_1_maj_suivi,
    hz.a_fait_1_maj_occupation,
    hz.a_fait_1_maj,
    hz.a_fait_1_campagne_ET_1_maj,
    hz.typologie_activation_simple,
    hz.typologie_activation_detaillee,
    COALESCE(hz.activation_level, 0) AS activation_level,
    
    -- =====================================================
    -- ESTABLISHMENT PRO-ACTIVITY
    -- =====================================================
    hz.kind_pro_activity_quantile,
    hz.kind_pro_activity_ntile,
    COALESCE(hz.total_pro_activity_score, 0) AS total_pro_activity_score,
    COALESCE(hz.pro_activity_level, 0) AS pro_activity_level,
    
    -- =====================================================
    -- ESTABLISHMENT METRICS
    -- =====================================================
    COALESCE(hz.total_campaigns_sent_establishment, 0) AS total_campaigns_sent_establishment,
    COALESCE(hz.housing_contacted_2024, 0) AS housing_contacted_2024,
    COALESCE(hz.housing_contacted_2023, 0) AS housing_contacted_2023,
    hz.housing_rate_contacted_2024,
    COALESCE(hz.establishment_user_count, 0) AS establishment_user_count,
    COALESCE(hz.establishment_has_active_users, FALSE) AS establishment_has_active_users,
    
    -- =====================================================
    -- COMPOSITE ZLV ENGAGEMENT
    -- =====================================================
    COALESCE(hz.zlv_engagement_score, 0) AS zlv_engagement_score,
    COALESCE(hz.zlv_engagement_category, 'Aucun engagement') AS zlv_engagement_category

FROM housing_out ho
LEFT JOIN housing_zlv hz ON ho.housing_id = hz.housing_id
