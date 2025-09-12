-- =====================================================
-- ZLV IMPACT ANALYSIS
-- Measuring the Impact of ZLV Campaigns on Housing Vacancy Exit
-- =====================================================

-- 1. Campaign Effectiveness Analysis
-- Chart: Bar chart showing exit rates by campaign participation
WITH campaign_effectiveness AS (
  SELECT 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Logement dans une campagne'
      ELSE 'Logement hors campagne'
    END as campaign_participation,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  GROUP BY 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Logement dans une campagne'
      ELSE 'Logement hors campagne'
    END
)
SELECT 
  campaign_participation,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate lift vs control group
  exit_rate_pct - LAG(exit_rate_pct) OVER (ORDER BY campaign_participation) as lift_vs_control
FROM campaign_effectiveness
ORDER BY exit_rate_pct DESC;

-- 2. Campaign Intensity Impact
-- Chart: Line chart showing exit rate by number of campaigns sent
WITH campaign_intensity AS (
  SELECT 
    CASE 
      WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
      WHEN h.total_sent = 1 THEN '1 campagne'
      WHEN h.total_sent = 2 THEN '2 campagnes'
      WHEN h.total_sent = 3 THEN '3 campagnes'
      WHEN h.total_sent = 4 THEN '4 campagnes'
      WHEN h.total_sent >= 5 THEN '5+ campagnes'
    END as campaign_intensity,
    h.total_sent as avg_campaigns_numeric,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
      WHEN h.total_sent = 1 THEN '1 campagne'
      WHEN h.total_sent = 2 THEN '2 campagnes'
      WHEN h.total_sent = 3 THEN '3 campagnes'
      WHEN h.total_sent = 4 THEN '4 campagnes'
      WHEN h.total_sent >= 5 THEN '5+ campagnes'
    END,
    h.total_sent
  HAVING COUNT(h.housing_id) >= 100  -- Filter for statistical significance
)
SELECT 
  campaign_intensity,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate incremental lift
  exit_rate_pct - FIRST_VALUE(exit_rate_pct) OVER (ORDER BY 
    CASE campaign_intensity
      WHEN '0 campagne' THEN 0
      WHEN '1 campagne' THEN 1
      WHEN '2 campagnes' THEN 2
      WHEN '3 campagnes' THEN 3
      WHEN '4 campagnes' THEN 4
      WHEN '5+ campagnes' THEN 5
    END
  ) as lift_vs_no_campaign
FROM campaign_intensity
ORDER BY 
  CASE campaign_intensity
    WHEN '0 campagne' THEN 0
    WHEN '1 campagne' THEN 1
    WHEN '2 campagnes' THEN 2
    WHEN '3 campagnes' THEN 3
    WHEN '4 campagnes' THEN 4
    WHEN '5+ campagnes' THEN 5
  END;

-- 3. Establishment Activity Level Impact
-- Chart: Bar chart showing exit rates by establishment activity level
WITH establishment_impact AS (
  SELECT 
    COALESCE(ea.typologie_activation_simple, 'Non rattaché') as establishment_activity,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_establishments e ON h.establishment_ids_array @> ARRAY[e.establishment_id]
  LEFT JOIN dwh.main_marts.marts_production_establishments_activation ea ON e.establishment_id = ea.establishment_id
  GROUP BY COALESCE(ea.typologie_activation_simple, 'Non rattaché')
  HAVING COUNT(h.housing_id) >= 50
)
SELECT 
  establishment_activity,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Rank by effectiveness
  ROW_NUMBER() OVER (ORDER BY exit_rate_pct DESC) as effectiveness_rank
FROM establishment_impact
ORDER BY exit_rate_pct DESC;

-- 4. Time-based Campaign Impact Analysis
-- Chart: Time series showing exit rates before/after campaign launch
WITH campaign_timeline_impact AS (
  SELECT 
    CASE 
      WHEN h.first_campaign_sent IS NULL THEN 'Jamais de campagne'
      WHEN h.first_campaign_sent >= '2024-01-01' THEN 'Campagne 2024'
      WHEN h.first_campaign_sent >= '2023-01-01' AND h.first_campaign_sent < '2024-01-01' THEN 'Campagne 2023'
      WHEN h.first_campaign_sent >= '2022-01-01' AND h.first_campaign_sent < '2023-01-01' THEN 'Campagne 2022'
      WHEN h.first_campaign_sent >= '2021-01-01' AND h.first_campaign_sent < '2022-01-01' THEN 'Campagne 2021'
      WHEN h.first_campaign_sent < '2021-01-01' THEN 'Campagne avant 2021'
    END as campaign_period,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.first_campaign_sent IS NULL THEN 'Jamais de campagne'
      WHEN h.first_campaign_sent >= '2024-01-01' THEN 'Campagne 2024'
      WHEN h.first_campaign_sent >= '2023-01-01' AND h.first_campaign_sent < '2024-01-01' THEN 'Campagne 2023'
      WHEN h.first_campaign_sent >= '2022-01-01' AND h.first_campaign_sent < '2023-01-01' THEN 'Campagne 2022'
      WHEN h.first_campaign_sent >= '2021-01-01' AND h.first_campaign_sent < '2022-01-01' THEN 'Campagne 2021'
      WHEN h.first_campaign_sent < '2021-01-01' THEN 'Campagne avant 2021'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  campaign_period,
  housing_out_count,
  total_housing_count,
  exit_rate_pct
FROM campaign_timeline_impact
ORDER BY 
  CASE campaign_period
    WHEN 'Jamais de campagne' THEN 0
    WHEN 'Campagne avant 2021' THEN 1
    WHEN 'Campagne 2021' THEN 2
    WHEN 'Campagne 2022' THEN 3
    WHEN 'Campagne 2023' THEN 4
    WHEN 'Campagne 2024' THEN 5
  END;

-- 5. Territory Coverage Impact
-- Chart: Bar chart comparing exit rates by territory coverage
WITH territory_impact AS (
  SELECT 
    CASE 
      WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
      WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
      ELSE 'Non renseigné'
    END as territory_status,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
      WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
      ELSE 'Non renseigné'
    END
)
SELECT 
  territory_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate lift for territories with user coverage
  exit_rate_pct - LAG(exit_rate_pct) OVER (ORDER BY territory_status DESC) as lift_vs_no_coverage
FROM territory_impact
ORDER BY exit_rate_pct DESC;

-- 6. Combined ZLV Action Score Impact
-- Chart: Scatter plot showing relationship between ZLV actions and exit rate
WITH zlv_action_score AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    -- Create comprehensive ZLV action score
    COALESCE(h.total_sent, 0) as campaigns_sent,
    COALESCE(h.total_groups, 0) as groups_count,
    CASE WHEN h.is_on_user_teritory THEN 1 ELSE 0 END as on_territory,
    CASE WHEN ch.housing_id IS NOT NULL THEN 1 ELSE 0 END as in_campaign,
    -- Combined ZLV action score
    COALESCE(h.total_sent, 0) * 2 +  -- Weight campaigns more heavily
    COALESCE(h.total_groups, 0) +
    CASE WHEN h.is_on_user_teritory THEN 1 ELSE 0 END +
    CASE WHEN ch.housing_id IS NOT NULL THEN 2 ELSE 0 END as zlv_action_score
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
),
score_categories AS (
  SELECT 
    CASE 
      WHEN zlv_action_score = 0 THEN 'Aucune action ZLV (0)'
      WHEN zlv_action_score >= 1 AND zlv_action_score <= 2 THEN 'Action faible (1-2)'
      WHEN zlv_action_score >= 3 AND zlv_action_score <= 4 THEN 'Action modérée (3-4)'
      WHEN zlv_action_score >= 5 AND zlv_action_score <= 7 THEN 'Action élevée (5-7)'
      WHEN zlv_action_score >= 8 THEN 'Action très élevée (8+)'
    END as action_category,
    COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
    COUNT(*) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as exit_rate_pct,
    ROUND(AVG(CASE WHEN is_out THEN zlv_action_score END), 1) as avg_score_out,
    ROUND(AVG(zlv_action_score), 1) as avg_score_total
  FROM zlv_action_score
  GROUP BY 
    CASE 
      WHEN zlv_action_score = 0 THEN 'Aucune action ZLV (0)'
      WHEN zlv_action_score >= 1 AND zlv_action_score <= 2 THEN 'Action faible (1-2)'
      WHEN zlv_action_score >= 3 AND zlv_action_score <= 4 THEN 'Action modérée (3-4)'
      WHEN zlv_action_score >= 5 AND zlv_action_score <= 7 THEN 'Action élevée (5-7)'
      WHEN zlv_action_score >= 8 THEN 'Action très élevée (8+)'
    END
  HAVING COUNT(*) >= 50
)
SELECT 
  action_category,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_score_out,
  avg_score_total,
  -- Calculate incremental lift vs no action
  exit_rate_pct - FIRST_VALUE(exit_rate_pct) OVER (ORDER BY 
    CASE action_category
      WHEN 'Aucune action ZLV (0)' THEN 0
      WHEN 'Action faible (1-2)' THEN 1
      WHEN 'Action modérée (3-4)' THEN 2
      WHEN 'Action élevée (5-7)' THEN 3
      WHEN 'Action très élevée (8+)' THEN 4
    END
  ) as lift_vs_no_action
FROM score_categories
ORDER BY 
  CASE action_category
    WHEN 'Aucune action ZLV (0)' THEN 0
    WHEN 'Action faible (1-2)' THEN 1
    WHEN 'Action modérée (3-4)' THEN 2
    WHEN 'Action élevée (5-7)' THEN 3
    WHEN 'Action très élevée (8+)' THEN 4
  END;

-- 7. Statistical Significance Test
-- Chart: Table showing statistical significance of campaign impact
WITH campaign_stats AS (
  SELECT 
    'Avec campagne' as group_type,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as successes,
    COUNT(h.housing_id) as total,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as success_rate
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Sans campagne' as group_type,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as successes,
    COUNT(h.housing_id) as total,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as success_rate
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NULL
)
SELECT 
  group_type,
  successes,
  total,
  success_rate,
  -- Calculate confidence intervals (approximate)
  ROUND(success_rate - 1.96 * SQRT(success_rate * (100 - success_rate) / total), 2) as ci_lower,
  ROUND(success_rate + 1.96 * SQRT(success_rate * (100 - success_rate) / total), 2) as ci_upper
FROM campaign_stats
ORDER BY success_rate DESC;

-- 8. ROI Estimation (Conceptual)
-- Chart: Table showing estimated impact and ROI of ZLV campaigns
WITH roi_estimation AS (
  SELECT 
    'Logements sortis grâce aux campagnes' as metric,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL AND ch.housing_id IS NOT NULL THEN 1 END) as value,
    'logements' as unit
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  
  UNION ALL
  
  SELECT 
    'Total campagnes envoyées',
    SUM(COALESCE(h.total_sent, 0)),
    'campagnes'
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Taux de conversion campagne → sortie',
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ),
    '%'
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL
)
SELECT 
  metric,
  value,
  unit
FROM roi_estimation;

