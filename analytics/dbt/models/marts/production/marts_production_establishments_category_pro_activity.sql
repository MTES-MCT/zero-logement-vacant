{{
config (
  materialized = 'table',
  unique_key = 'establishment_id',
)
}}

WITH operational_establishments AS (
    -- Filtrer uniquement les établissements opérationnels ouverts (EPCI, Communes)
    SELECT 
        pe.id AS establishment_id,
        pe.kind,
        pe.name 
    FROM {{ ref('marts_production_establishments') }} pe
    WHERE pe.kind IN ('CA', 'CC', 'CU', 'ME', 'Commune')
    AND pe.user_number > 0
),

-- Récupérer les données de morphologie pour les parc LOVAC et FF
establishment_housing_data AS (
    SELECT
        oe.establishment_id,
        SUM(CASE WHEN mcm.year = 2024 THEN mcm.count_vacant_housing_private_fil_public ELSE 0 END) AS lovac_2024_count,
        SUM(CASE WHEN mcm.year = 2023 THEN mcm.count_vacant_housing_private_fil_public ELSE 0 END) AS lovac_2023_count,
        SUM(CASE WHEN mcm.year = 2024 THEN mcm.count_housing_private_rented ELSE 0 END) AS ff_2023_count
    FROM operational_establishments oe
    LEFT JOIN {{ ref('int_production_establishments_localities') }} pel ON oe.establishment_id = pel.establishment_id
    LEFT JOIN {{ ref('marts_common_morphology') }} mcm ON pel.geo_code = mcm.geo_code
    WHERE mcm.year IN (2023, 2024)
    GROUP BY oe.establishment_id
),

-- Récupérer les données de campagnes et contacts
establishment_campaign_data AS (
    SELECT 
        oe.establishment_id,
        COALESCE(me.total_sent_campaigns, 0) AS total_campaigns_sent,
        COALESCE(me.contacted_housing_2024, 0) AS housing_contacted_2024,
        COALESCE(me.contacted_housing_2023, 0) AS housing_contacted_2023
    FROM operational_establishments oe
    LEFT JOIN {{ ref('marts_production_establishments') }} me ON oe.establishment_id = me.establishment_id
),

-- Calculer les métriques de base
base_metrics AS (
    SELECT 
        oe.establishment_id,
        oe.kind,
        oe.name,
        -- Données de campagnes
        ecd.total_campaigns_sent,
        ecd.housing_contacted_2024,
        ecd.housing_contacted_2023,
        
        -- Données de parc de logements
        ehd.lovac_2024_count,
        ehd.lovac_2023_count,
        ehd.ff_2023_count,
        
        -- Calcul des taux
        CASE 
            WHEN (ehd.lovac_2024_count + ehd.ff_2023_count) > 0 
            THEN ROUND((ecd.housing_contacted_2024::FLOAT / (ehd.lovac_2024_count + ehd.ff_2023_count)) * 100, 2)
            ELSE 0 
        END AS housing_rate_contacted_2024,
        
        CASE 
            WHEN ehd.lovac_2024_count > 0 
            THEN ROUND((ecd.housing_contacted_2024::FLOAT / ehd.lovac_2024_count) * 100, 2)
            ELSE 0 
        END AS housing_vacant_rate_contacted_2024,
        
        CASE 
            WHEN ehd.lovac_2023_count > 0 
            THEN ROUND((ecd.housing_contacted_2023::FLOAT / ehd.lovac_2023_count) * 100, 2)
            ELSE 0 
        END AS housing_vacant_rate_contacted_2023,
        
        CASE 
            WHEN ehd.ff_2023_count > 0 
            THEN ROUND((ecd.housing_contacted_2024::FLOAT / ehd.ff_2023_count) * 100, 2)
            ELSE 0 
        END AS housing_rented_rate_contacted_2024
        
    FROM operational_establishments oe
    LEFT JOIN establishment_campaign_data ecd ON oe.establishment_id = ecd.establishment_id
    LEFT JOIN establishment_housing_data ehd ON oe.establishment_id = ehd.establishment_id
),

-- Calculer les quartiles pour chaque métrique (méthode quantile)
quartiles AS (
    SELECT
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_campaigns_sent) AS q1_campaigns_sent,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_campaigns_sent) AS q2_campaigns_sent,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_campaigns_sent) AS q3_campaigns_sent,
        
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_contacted_2024) AS q1_housing_contacted,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_contacted_2024) AS q2_housing_contacted,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_contacted_2024) AS q3_housing_contacted,
        
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_rate_contacted_2024) AS q1_housing_rate_contacted_2024,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_rate_contacted_2024) AS q2_housing_rate_contacted_2024,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_rate_contacted_2024) AS q3_housing_rate_contacted_2024,
        
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2024) AS q1_housing_vacant_rate_contacted_2024,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2024) AS q2_housing_vacant_rate_contacted_2024,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2024) AS q3_housing_vacant_rate_contacted_2024,
        
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2023) AS q1_housing_vacant_rate_contacted_2023,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2023) AS q2_housing_vacant_rate_contacted_2023,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate_contacted_2023) AS q3_housing_vacant_rate_contacted_2023,
        
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_rented_rate_contacted_2024) AS q1_housing_rented_rate_contacted_2024,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_rented_rate_contacted_2024) AS q2_housing_rented_rate_contacted_2024,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_rented_rate_contacted_2024) AS q3_housing_rented_rate_contacted_2024
    FROM base_metrics
),

-- Calculer les classifications par quartiles et les scores avec les deux méthodes
pro_activity_classification AS (
    SELECT 
        bm.establishment_id,
        CAST(bm.establishment_id AS VARCHAR) AS establishment_id_varchar,
        bm.kind,
        bm.name,
        
        -- Métriques de base
        bm.total_campaigns_sent,
        bm.housing_contacted_2024,
        bm.housing_rate_contacted_2024,
        bm.housing_vacant_rate_contacted_2024,
        bm.housing_vacant_rate_contacted_2023,
        bm.housing_rented_rate_contacted_2024,
        
        -- Classifications par quartiles - MÉTHODE QUANTILE (1-4 points)
        CASE 
            WHEN bm.total_campaigns_sent <= q.q1_campaigns_sent THEN 1
            WHEN bm.total_campaigns_sent <= q.q2_campaigns_sent THEN 2
            WHEN bm.total_campaigns_sent <= q.q3_campaigns_sent THEN 3
            ELSE 4
        END AS kind_campaigns_sent_quantile,
        
        CASE 
            WHEN bm.housing_contacted_2024 <= q.q1_housing_contacted THEN 1
            WHEN bm.housing_contacted_2024 <= q.q2_housing_contacted THEN 2
            WHEN bm.housing_contacted_2024 <= q.q3_housing_contacted THEN 3
            ELSE 4
        END AS kind_housing_contacted_quantile,
        
        CASE 
            WHEN bm.housing_rate_contacted_2024 <= q.q1_housing_rate_contacted_2024 THEN 1
            WHEN bm.housing_rate_contacted_2024 <= q.q2_housing_rate_contacted_2024 THEN 2
            WHEN bm.housing_rate_contacted_2024 <= q.q3_housing_rate_contacted_2024 THEN 3
            ELSE 4
        END AS kind_housing_rate_contacted_2024_quantile,
        
        CASE 
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q1_housing_vacant_rate_contacted_2024 THEN 1
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q2_housing_vacant_rate_contacted_2024 THEN 2
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q3_housing_vacant_rate_contacted_2024 THEN 3
            ELSE 4
        END AS kind_housing_vacant_rate_contacted_2024_quantile,
        
        CASE 
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q1_housing_vacant_rate_contacted_2024 THEN 1
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q2_housing_vacant_rate_contacted_2024 THEN 2
            WHEN bm.housing_vacant_rate_contacted_2024 <= q.q3_housing_vacant_rate_contacted_2024 THEN 3
            ELSE 4
        END AS kind_housing_vacant_rate_contacted_quantile,
        
        CASE 
            WHEN bm.housing_vacant_rate_contacted_2023 <= q.q1_housing_vacant_rate_contacted_2023 THEN 1
            WHEN bm.housing_vacant_rate_contacted_2023 <= q.q2_housing_vacant_rate_contacted_2023 THEN 2
            WHEN bm.housing_vacant_rate_contacted_2023 <= q.q3_housing_vacant_rate_contacted_2023 THEN 3
            ELSE 4
        END AS kind_housing_vacant_rate_contacted_2023_quantile,
        
        CASE 
            WHEN bm.housing_rented_rate_contacted_2024 <= q.q1_housing_rented_rate_contacted_2024 THEN 1
            WHEN bm.housing_rented_rate_contacted_2024 <= q.q2_housing_rented_rate_contacted_2024 THEN 2
            WHEN bm.housing_rented_rate_contacted_2024 <= q.q3_housing_rented_rate_contacted_2024 THEN 3
            ELSE 4
        END AS kind_housing_rented_rate_contacted_2024_quantile,
        
        -- Classifications par quartiles - MÉTHODE NTILE (égale cardinalité) (1-4 points)
        NTILE(4) OVER (ORDER BY bm.total_campaigns_sent) AS kind_campaigns_sent_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_contacted_2024) AS kind_housing_contacted_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_rate_contacted_2024) AS kind_housing_rate_contacted_2024_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_vacant_rate_contacted_2024) AS kind_housing_vacant_rate_contacted_2024_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_vacant_rate_contacted_2024) AS kind_housing_vacant_rate_contacted_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_vacant_rate_contacted_2023) AS kind_housing_vacant_rate_contacted_2023_ntile,
        NTILE(4) OVER (ORDER BY bm.housing_rented_rate_contacted_2024) AS kind_housing_rented_rate_contacted_2024_ntile
        
    FROM base_metrics bm
    CROSS JOIN quartiles q
),

-- Calculer les scores totaux avec les deux méthodes
scores_calculation AS (
    SELECT 
        *,
        -- Calcul du score total de pro-activité - MÉTHODE QUANTILE (somme des 7 critères)
        (kind_campaigns_sent_quantile + 
         kind_housing_contacted_quantile + 
         kind_housing_rate_contacted_2024_quantile + 
         kind_housing_vacant_rate_contacted_quantile + 
         kind_housing_vacant_rate_contacted_2024_quantile + 
         kind_housing_vacant_rate_contacted_2023_quantile + 
         kind_housing_rented_rate_contacted_2024_quantile) AS total_pro_activity_quantile,
        
        -- Calcul du score total de pro-activité - MÉTHODE NTILE (somme des 7 critères)
        (kind_campaigns_sent_ntile + 
         kind_housing_contacted_ntile + 
         kind_housing_rate_contacted_2024_ntile + 
         kind_housing_vacant_rate_contacted_ntile + 
         kind_housing_vacant_rate_contacted_2024_ntile + 
         kind_housing_vacant_rate_contacted_2023_ntile + 
         kind_housing_rented_rate_contacted_2024_ntile) AS total_pro_activity_ntile
    FROM pro_activity_classification
),

-- Calculer les quartiles pour les scores totaux avec les deux méthodes
total_quartiles AS (
    SELECT
        -- Quartiles pour la méthode quantile
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_pro_activity_quantile) AS q1_total_quantile,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_pro_activity_quantile) AS q2_total_quantile,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_pro_activity_quantile) AS q3_total_quantile,
        
        -- Quartiles pour la méthode ntile
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_pro_activity_ntile) AS q1_total_ntile,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_pro_activity_ntile) AS q2_total_ntile,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_pro_activity_ntile) AS q3_total_ntile
    FROM scores_calculation
),

-- Classification finale avec les deux méthodes
final_classification AS (
    SELECT 
        sc.*,
        -- Classification finale par quartiles de pro-activité - MÉTHODE QUANTILE
        CASE 
            WHEN sc.total_pro_activity_quantile <= tq.q1_total_quantile THEN 'Non pro-actif'
            WHEN sc.total_pro_activity_quantile <= tq.q2_total_quantile THEN 'Peu pro-actif'
            WHEN sc.total_pro_activity_quantile <= tq.q3_total_quantile THEN 'Pro-actif'
            ELSE 'Très pro-actif'
        END AS kind_pro_activity_quantile,
        
        -- Classification finale par quartiles de pro-activité - MÉTHODE NTILE
        CASE 
            WHEN sc.total_pro_activity_ntile <= tq.q1_total_ntile THEN 'Non pro-actif'
            WHEN sc.total_pro_activity_ntile <= tq.q2_total_ntile THEN 'Peu pro-actif'
            WHEN sc.total_pro_activity_ntile <= tq.q3_total_ntile THEN 'Pro-actif'
            ELSE 'Très pro-actif'
        END AS kind_pro_activity_ntile,
        
        -- Classification finale par égale cardinalité (NTILE direct sur le score total)
        CASE
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_quantile) = 1 THEN 'Non pro-actif'
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_quantile) = 2 THEN 'Peu pro-actif'
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_quantile) = 3 THEN 'Pro-actif'
            ELSE 'Très pro-actif'
        END AS kind_pro_activity_quantile_ntile,
        
        CASE
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_ntile) = 1 THEN 'Non pro-actif'
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_ntile) = 2 THEN 'Peu pro-actif'
            WHEN NTILE(4) OVER (ORDER BY sc.total_pro_activity_ntile) = 3 THEN 'Pro-actif'
            ELSE 'Très pro-actif'
        END AS kind_pro_activity_ntile_ntile
    FROM scores_calculation sc
    CROSS JOIN total_quartiles tq
)

SELECT 
    fc.establishment_id_varchar AS establishment_id,
    fc.name,
    fc.kind,
    
    -- Métriques de base
    fc.total_campaigns_sent,
    fc.housing_contacted_2024,
    fc.housing_rate_contacted_2024,
    fc.housing_vacant_rate_contacted_2024,
    fc.housing_vacant_rate_contacted_2023,
    fc.housing_rented_rate_contacted_2024,
    
    -- Classifications détaillées - MÉTHODE QUANTILE (scores 1-4)
    fc.kind_campaigns_sent_quantile,
    fc.kind_housing_contacted_quantile,
    fc.kind_housing_rate_contacted_2024_quantile,
    fc.kind_housing_vacant_rate_contacted_quantile,
    fc.kind_housing_vacant_rate_contacted_2024_quantile,
    fc.kind_housing_vacant_rate_contacted_2023_quantile,
    fc.kind_housing_rented_rate_contacted_2024_quantile,
    
    -- Classifications détaillées - MÉTHODE NTILE (scores 1-4)
    fc.kind_campaigns_sent_ntile,
    fc.kind_housing_contacted_ntile,
    fc.kind_housing_rate_contacted_2024_ntile,
    fc.kind_housing_vacant_rate_contacted_ntile,
    fc.kind_housing_vacant_rate_contacted_2024_ntile,
    fc.kind_housing_vacant_rate_contacted_2023_ntile,
    fc.kind_housing_rented_rate_contacted_2024_ntile,
    
    -- Scores totaux de pro-activité avec les deux méthodes
    fc.total_pro_activity_quantile,
    fc.total_pro_activity_ntile,
    
    -- Classifications finales avec les deux méthodes
    fc.kind_pro_activity_quantile,
    fc.kind_pro_activity_ntile,
    fc.kind_pro_activity_quantile_ntile,
    fc.kind_pro_activity_ntile_ntile

FROM final_classification fc
ORDER BY fc.total_pro_activity_quantile DESC, fc.establishment_id_varchar 