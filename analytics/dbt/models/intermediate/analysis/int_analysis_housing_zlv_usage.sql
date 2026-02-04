-- Intermediate model: ZLV application usage features at housing level
-- Combines establishment activation, pro-activity, campaign data, groups, and status updates
-- for vacancy exit analysis

WITH housing_base AS (
    -- Get all housing with LOVAC history
    SELECT 
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

-- Consolidate all establishment data into one CTE
-- Filter to LOCAL collectivities only (exclude departmental/regional establishments)
-- Kept: CC, CU, ME, CA, Commune (local collectivities with actual territorial action)
-- Excluded: SDED, SDER, DEP, REG (cover entire departments/regions - not actionable)
establishment_data AS (
    SELECT
        e.establishment_id,
        e.name AS establishment_name,
        e.kind AS establishment_kind,
        e.establishment_kind_label,
        e.user_number AS establishment_user_count,
        e.last_authenticated_at AS establishment_last_authenticated_at,
        e.contacted_housing_2024,
        e.contacted_housing_2023,
        -- Activation metrics
        ea.connecte_90_derniers_jours,
        ea.connecte_60_derniers_jours,
        ea.connecte_30_derniers_jours,
        ea.a_depose_1_perimetre,
        ea.a_cree_1_groupe,
        ea.a_cree_1_campagne,
        ea.a_envoye_1_campagne,
        ea.a_fait_1_maj_suivi,
        ea.a_fait_1_maj_occupation,
        ea.a_fait_1_maj,
        ea.a_fait_1_campagne_ET_1_maj,
        ea.typologie_activation_simple,
        ea.typologie_activation_detaillee,
        ea.type_regroupe AS establishment_type_regroupe,
        -- Pro-activity metrics
        epa.total_campaigns_sent AS total_campaigns_sent_establishment,
        epa.housing_contacted_2024 AS pro_activity_housing_contacted_2024,
        epa.housing_rate_contacted_2024,
        epa.housing_vacant_rate_contacted_2024,
        epa.kind_pro_activity_quantile,
        epa.kind_pro_activity_ntile,
        epa.total_pro_activity_quantile
    FROM {{ ref('marts_production_establishments') }} e
    LEFT JOIN {{ ref('marts_production_establishments_activation') }} ea 
        ON e.establishment_id = ea.establishment_id
    LEFT JOIN {{ ref('marts_production_establishments_category_pro_activity') }} epa 
        ON e.establishment_id = epa.establishment_id
    -- Keep only local collectivities (communes, intercommunalities)
    WHERE e.kind IN ('CC', 'CU', 'ME', 'CA', 'Commune', 'SIVOM', 'CTU')
),

-- Housing to establishment mapping
housing_establishments AS (
    SELECT
        housing_id,
        establishment_ids_array
    FROM {{ ref('int_production_housing_establishments') }}
),

-- Housing campaign data
housing_campaigns AS (
    SELECT
        housing_id,
        first_campaign_created,
        last_campaign_created,
        first_campaign_sent,
        last_campaign_sent,
        total_validated,
        total_confirmed,
        total_sent
    FROM {{ ref('int_production_housing_campaigns') }}
),

-- Housing groups data
housing_groups AS (
    SELECT
        housing_id,
        total_groups,
        group_titles,
        first_group_created,
        last_group_created,
        first_group_exported,
        last_group_exported
    FROM {{ ref('int_production_housing_groups') }}
),

-- Housing last status (for status updates tracking) - Full details
housing_last_status AS (
    SELECT
        housing_id,
        -- Followup status (ZLV automatic)
        last_event_status_zlv_followup,
        last_event_status_label_zlv_followup,
        last_event_date_zlv_followup,
        -- Followup status (user input)
        last_event_status_user_followup,
        last_event_status_label_user_followup,
        last_event_date_user_followup,
        last_event_sub_status_label_user_followup,
        -- Followup status (combined)
        last_event_status_followup,
        last_event_status_label_followup,
        last_event_date_followup,
        -- Occupancy status (ZLV automatic)
        last_event_status_zlv_occupancy,
        last_event_status_label_zlv_occupancy,
        last_event_date_zlv_occupancy,
        -- Occupancy status (user input)
        last_event_status_user_occupancy,
        last_event_status_label_user_occupancy,
        last_event_date_user_occupancy,
        last_event_sub_status_label_user_occupancy,
        -- Occupancy status (combined)
        last_event_status_occupancy,
        last_event_status_label_occupancy,
        last_event_date_occupancy
    FROM {{ ref('int_production_housing_last_status') }}
),

-- Housing users info
housing_users AS (
    SELECT
        housing_id,
        has_users
    FROM {{ ref('int_production_housing_users') }}
),

-- Join housing with all data sources
housing_enriched AS (
    SELECT
        h.housing_id,
        h.geo_code,
        -- Primary establishment ID
        CASE 
            WHEN he.establishment_ids_array IS NOT NULL 
                 AND array_length(he.establishment_ids_array) > 0
            THEN CAST(he.establishment_ids_array[1] AS VARCHAR)
            ELSE NULL
        END AS primary_establishment_id,
        -- Number of establishments
        CASE 
            WHEN he.establishment_ids_array IS NOT NULL 
            THEN array_length(he.establishment_ids_array)
            ELSE 0
        END AS establishment_count,
        -- Campaign data
        hc.first_campaign_created,
        hc.last_campaign_created,
        hc.first_campaign_sent,
        hc.last_campaign_sent,
        hc.total_validated,
        hc.total_confirmed,
        hc.total_sent,
        -- Group data
        hg.total_groups,
        hg.group_titles,
        hg.first_group_created,
        hg.last_group_created,
        hg.first_group_exported,
        hg.last_group_exported,
        -- Full status data
        hls.last_event_status_zlv_followup,
        hls.last_event_status_label_zlv_followup,
        hls.last_event_date_zlv_followup,
        hls.last_event_status_user_followup,
        hls.last_event_status_label_user_followup,
        hls.last_event_date_user_followup,
        hls.last_event_sub_status_label_user_followup,
        hls.last_event_status_followup,
        hls.last_event_status_label_followup,
        hls.last_event_date_followup,
        hls.last_event_status_zlv_occupancy,
        hls.last_event_status_label_zlv_occupancy,
        hls.last_event_date_zlv_occupancy,
        hls.last_event_status_user_occupancy,
        hls.last_event_status_label_user_occupancy,
        hls.last_event_date_user_occupancy,
        hls.last_event_sub_status_label_user_occupancy,
        hls.last_event_status_occupancy,
        hls.last_event_status_label_occupancy,
        hls.last_event_date_occupancy,
        -- User coverage
        COALESCE(hu.has_users, FALSE) AS is_on_user_territory
    FROM housing_base h
    LEFT JOIN housing_establishments he ON CAST(h.housing_id AS UUID) = he.housing_id
    LEFT JOIN housing_campaigns hc ON CAST(h.housing_id AS UUID) = hc.housing_id
    LEFT JOIN housing_groups hg ON CAST(h.housing_id AS UUID) = hg.housing_id
    LEFT JOIN housing_last_status hls ON CAST(h.housing_id AS UUID) = hls.housing_id
    LEFT JOIN housing_users hu ON CAST(h.housing_id AS UUID) = hu.housing_id
),

-- Final join with establishment data
final AS (
    SELECT
        h.housing_id,
        h.primary_establishment_id AS establishment_id,
        h.establishment_count,
        
        -- =====================================================
        -- HOUSING CONTACT STATUS
        -- =====================================================
        CASE 
            WHEN h.total_sent > 0 THEN TRUE 
            ELSE FALSE 
        END AS was_contacted_by_zlv,
        COALESCE(h.total_sent, 0) AS contact_count,
        CASE 
            WHEN COALESCE(h.total_sent, 0) = 0 THEN 'Non contacte'
            WHEN h.total_sent = 1 THEN '1 contact'
            WHEN h.total_sent <= 3 THEN '2-3 contacts'
            ELSE '4+ contacts'
        END AS contact_intensity,
        
        h.first_campaign_sent AS first_contact_date,
        h.last_campaign_sent AS last_contact_date,
        CASE 
            WHEN h.first_campaign_sent IS NOT NULL 
            THEN DATE_DIFF('day', CAST(h.first_campaign_sent AS DATE), CURRENT_DATE)
            ELSE NULL
        END AS days_since_first_contact,
        CASE 
            WHEN h.last_campaign_sent IS NOT NULL 
            THEN DATE_DIFF('day', CAST(h.last_campaign_sent AS DATE), CURRENT_DATE)
            ELSE NULL
        END AS days_since_last_contact,
        CASE 
            WHEN h.last_campaign_sent IS NULL THEN 'Jamais contacte'
            WHEN DATE_DIFF('day', CAST(h.last_campaign_sent AS DATE), CURRENT_DATE) <= 180 THEN 'Recent (<6 mois)'
            WHEN DATE_DIFF('day', CAST(h.last_campaign_sent AS DATE), CURRENT_DATE) <= 365 THEN 'Moyen (6-12 mois)'
            ELSE 'Ancien (>12 mois)'
        END AS contact_recency_category,
        
        -- =====================================================
        -- CAMPAIGN DETAILS
        -- =====================================================
        h.first_campaign_created,
        h.last_campaign_created,
        h.first_campaign_sent AS first_campaign_sent_date,
        h.last_campaign_sent AS last_campaign_sent_date,
        COALESCE(h.total_validated, 0) AS total_campaigns_validated,
        COALESCE(h.total_confirmed, 0) AS total_campaigns_confirmed,
        COALESCE(h.total_sent, 0) AS total_campaigns_sent,
        COALESCE(h.total_sent, 0) AS total_campaigns_received,
        CASE WHEN COALESCE(h.total_sent, 0) > 0 THEN TRUE ELSE FALSE END AS has_received_campaign,
        
        -- =====================================================
        -- GROUP DETAILS
        -- =====================================================
        COALESCE(h.total_groups, 0) AS total_groups,
        h.group_titles,
        h.first_group_created,
        h.last_group_created,
        h.first_group_exported,
        h.last_group_exported,
        CASE WHEN COALESCE(h.total_groups, 0) > 0 THEN TRUE ELSE FALSE END AS is_in_group,
        CASE 
            WHEN COALESCE(h.total_groups, 0) = 0 THEN 'Aucun groupe'
            WHEN h.total_groups = 1 THEN '1 groupe'
            WHEN h.total_groups <= 3 THEN '2-3 groupes'
            ELSE '4+ groupes'
        END AS group_intensity,
        CASE 
            WHEN h.first_group_exported IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS was_exported_from_group,
        
        -- =====================================================
        -- HOUSING STATUS UPDATES - FOLLOWUP (SUIVI)
        -- =====================================================
        h.last_event_status_followup,
        h.last_event_status_label_followup,
        h.last_event_date_followup,
        h.last_event_status_zlv_followup,
        h.last_event_status_label_zlv_followup,
        h.last_event_date_zlv_followup,
        h.last_event_status_user_followup,
        h.last_event_status_label_user_followup,
        h.last_event_date_user_followup,
        h.last_event_sub_status_label_user_followup,
        CASE WHEN h.last_event_status_followup IS NOT NULL THEN TRUE ELSE FALSE END AS has_status_update,
        CASE WHEN h.last_event_status_user_followup IS NOT NULL THEN TRUE ELSE FALSE END AS has_user_followup_update,
        CASE WHEN h.last_event_status_zlv_followup IS NOT NULL THEN TRUE ELSE FALSE END AS has_zlv_followup_update,
        
        -- =====================================================
        -- HOUSING STATUS UPDATES - OCCUPANCY
        -- =====================================================
        h.last_event_status_occupancy,
        h.last_event_status_label_occupancy,
        h.last_event_date_occupancy,
        h.last_event_status_zlv_occupancy,
        h.last_event_status_label_zlv_occupancy,
        h.last_event_date_zlv_occupancy,
        h.last_event_status_user_occupancy,
        h.last_event_status_label_user_occupancy,
        h.last_event_date_user_occupancy,
        h.last_event_sub_status_label_user_occupancy,
        CASE WHEN h.last_event_status_occupancy IS NOT NULL THEN TRUE ELSE FALSE END AS has_occupancy_update,
        CASE WHEN h.last_event_status_user_occupancy IS NOT NULL THEN TRUE ELSE FALSE END AS has_user_occupancy_update,
        CASE WHEN h.last_event_status_zlv_occupancy IS NOT NULL THEN TRUE ELSE FALSE END AS has_zlv_occupancy_update,
        
        -- =====================================================
        -- COMBINED STATUS UPDATE INDICATORS
        -- =====================================================
        CASE 
            WHEN h.last_event_status_followup IS NOT NULL OR h.last_event_status_occupancy IS NOT NULL 
            THEN TRUE 
            ELSE FALSE 
        END AS has_any_update,
        CASE 
            WHEN h.last_event_status_followup IS NULL AND h.last_event_status_occupancy IS NULL THEN 'Aucune MAJ'
            WHEN h.last_event_status_followup IS NOT NULL AND h.last_event_status_occupancy IS NOT NULL THEN 'MAJ complete'
            WHEN h.last_event_status_occupancy IS NOT NULL THEN 'MAJ occupation'
            WHEN h.last_event_status_followup IS NOT NULL THEN 'MAJ suivi'
            ELSE 'Aucune MAJ'
        END AS update_intensity,
        -- Days since last status update
        CASE 
            WHEN h.last_event_date_followup IS NOT NULL 
            THEN DATE_DIFF('day', CAST(h.last_event_date_followup AS DATE), CURRENT_DATE)
            ELSE NULL
        END AS days_since_last_followup_update,
        CASE 
            WHEN h.last_event_date_occupancy IS NOT NULL 
            THEN DATE_DIFF('day', CAST(h.last_event_date_occupancy AS DATE), CURRENT_DATE)
            ELSE NULL
        END AS days_since_last_occupancy_update,
        
        -- =====================================================
        -- USER TERRITORY COVERAGE
        -- =====================================================
        h.is_on_user_territory,
        
        -- =====================================================
        -- ESTABLISHMENT BASIC INFO
        -- =====================================================
        ed.establishment_name,
        ed.establishment_kind,
        ed.establishment_kind_label,
        ed.establishment_type_regroupe,
        
        -- =====================================================
        -- ESTABLISHMENT ACTIVATION
        -- =====================================================
        ed.connecte_90_derniers_jours,
        ed.connecte_60_derniers_jours,
        ed.connecte_30_derniers_jours,
        ed.a_depose_1_perimetre,
        ed.a_cree_1_groupe,
        ed.a_cree_1_campagne,
        ed.a_envoye_1_campagne,
        ed.a_fait_1_maj_suivi,
        ed.a_fait_1_maj_occupation,
        ed.a_fait_1_maj,
        ed.a_fait_1_campagne_ET_1_maj,
        ed.typologie_activation_simple,
        ed.typologie_activation_detaillee,
        CASE 
            WHEN ed.typologie_activation_simple LIKE '(1)%' THEN 1
            WHEN ed.typologie_activation_simple LIKE '(2)%' THEN 2
            WHEN ed.typologie_activation_simple LIKE '(3)%' THEN 3
            WHEN ed.typologie_activation_simple LIKE '(4)%' THEN 4
            WHEN ed.typologie_activation_simple LIKE '(5)%' THEN 5
            ELSE 0
        END AS activation_level,
        
        -- =====================================================
        -- ESTABLISHMENT PRO-ACTIVITY
        -- =====================================================
        ed.total_campaigns_sent_establishment,
        ed.contacted_housing_2024 AS housing_contacted_2024,
        ed.contacted_housing_2023 AS housing_contacted_2023,
        ed.housing_rate_contacted_2024,
        ed.housing_vacant_rate_contacted_2024,
        ed.kind_pro_activity_quantile,
        ed.kind_pro_activity_ntile,
        COALESCE(ed.total_pro_activity_quantile, 0) AS total_pro_activity_score,
        CASE 
            WHEN ed.kind_pro_activity_ntile = 'Non pro-actif' THEN 1
            WHEN ed.kind_pro_activity_ntile = 'Peu pro-actif' THEN 2
            WHEN ed.kind_pro_activity_ntile = 'Pro-actif' THEN 3
            WHEN ed.kind_pro_activity_ntile = 'Très pro-actif' THEN 4
            ELSE 0
        END AS pro_activity_level,
        
        -- =====================================================
        -- ESTABLISHMENT USER ACTIVITY
        -- =====================================================
        COALESCE(ed.establishment_user_count, 0) AS establishment_user_count,
        CASE WHEN COALESCE(ed.establishment_user_count, 0) > 0 THEN TRUE ELSE FALSE END AS establishment_has_active_users,
        ed.establishment_last_authenticated_at,
        
        -- =====================================================
        -- COMPOSITE ZLV ENGAGEMENT SCORE
        -- =====================================================
        -- Score from 0-10 combining contact + group + activation + pro-activity
        (
            CASE WHEN COALESCE(h.total_sent, 0) > 0 THEN 3 ELSE 0 END +  -- Contact weight: 3
            CASE WHEN COALESCE(h.total_groups, 0) > 0 THEN 1 ELSE 0 END +  -- Group weight: 1
            CASE 
                WHEN ed.typologie_activation_simple LIKE '(4)%' OR ed.typologie_activation_simple LIKE '(5)%' THEN 3
                WHEN ed.typologie_activation_simple LIKE '(3)%' THEN 2
                WHEN ed.typologie_activation_simple LIKE '(2)%' THEN 1
                ELSE 0 
            END +  -- Activation weight: 0-3
            CASE 
                WHEN ed.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                WHEN ed.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                WHEN ed.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                ELSE 0 
            END  -- Pro-activity weight: 0-3
        ) AS zlv_engagement_score,
        
        -- ZLV Engagement Category
        CASE 
            WHEN (
                CASE WHEN COALESCE(h.total_sent, 0) > 0 THEN 3 ELSE 0 END +
                CASE WHEN COALESCE(h.total_groups, 0) > 0 THEN 1 ELSE 0 END +
                CASE 
                    WHEN ed.typologie_activation_simple LIKE '(4)%' OR ed.typologie_activation_simple LIKE '(5)%' THEN 3
                    WHEN ed.typologie_activation_simple LIKE '(3)%' THEN 2
                    WHEN ed.typologie_activation_simple LIKE '(2)%' THEN 1
                    ELSE 0 
                END +
                CASE 
                    WHEN ed.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                    WHEN ed.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                    WHEN ed.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                    ELSE 0 
                END
            ) = 0 THEN 'Aucun engagement'
            WHEN (
                CASE WHEN COALESCE(h.total_sent, 0) > 0 THEN 3 ELSE 0 END +
                CASE WHEN COALESCE(h.total_groups, 0) > 0 THEN 1 ELSE 0 END +
                CASE 
                    WHEN ed.typologie_activation_simple LIKE '(4)%' OR ed.typologie_activation_simple LIKE '(5)%' THEN 3
                    WHEN ed.typologie_activation_simple LIKE '(3)%' THEN 2
                    WHEN ed.typologie_activation_simple LIKE '(2)%' THEN 1
                    ELSE 0 
                END +
                CASE 
                    WHEN ed.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                    WHEN ed.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                    WHEN ed.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                    ELSE 0 
                END
            ) <= 3 THEN 'Engagement faible'
            WHEN (
                CASE WHEN COALESCE(h.total_sent, 0) > 0 THEN 3 ELSE 0 END +
                CASE WHEN COALESCE(h.total_groups, 0) > 0 THEN 1 ELSE 0 END +
                CASE 
                    WHEN ed.typologie_activation_simple LIKE '(4)%' OR ed.typologie_activation_simple LIKE '(5)%' THEN 3
                    WHEN ed.typologie_activation_simple LIKE '(3)%' THEN 2
                    WHEN ed.typologie_activation_simple LIKE '(2)%' THEN 1
                    ELSE 0 
                END +
                CASE 
                    WHEN ed.kind_pro_activity_ntile = 'Très pro-actif' THEN 3
                    WHEN ed.kind_pro_activity_ntile = 'Pro-actif' THEN 2
                    WHEN ed.kind_pro_activity_ntile = 'Peu pro-actif' THEN 1
                    ELSE 0 
                END
            ) <= 6 THEN 'Engagement moyen'
            ELSE 'Engagement fort'
        END AS zlv_engagement_category
        
    FROM housing_enriched h
    LEFT JOIN establishment_data ed ON h.primary_establishment_id = ed.establishment_id
)

SELECT * FROM final
