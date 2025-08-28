-- =====================================================
-- PROACTIVITY ANALYSIS
-- Housing Out of Vacancy vs Total Stock - Campaign and Establishment Activity
-- =====================================================

-- 1. Campaign Participation Analysis
-- Chart: Bar chart comparing housing in campaigns vs not in campaigns
WITH campaign_participation AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    ch.housing_id IS NOT NULL as in_campaign,
    h.total_sent > 0 as received_campaign
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
)
SELECT 
  CASE 
    WHEN in_campaign THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END as campaign_status,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as pct_housing_out
FROM campaign_participation
GROUP BY 
  CASE 
    WHEN in_campaign THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END
ORDER BY pct_housing_out DESC;

-- 2. Number of Campaigns Sent Analysis
-- Chart: Histogram showing distribution by number of campaigns sent
WITH campaigns_sent_analysis AS (
  SELECT 
    CASE 
      WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
      WHEN h.total_sent = 1 THEN '1 campagne'
      WHEN h.total_sent = 2 THEN '2 campagnes'
      WHEN h.total_sent = 3 THEN '3 campagnes'
      WHEN h.total_sent >= 4 THEN '4+ campagnes'
    END as campaigns_sent_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.total_sent END), 1) as avg_campaigns_out,
    ROUND(AVG(h.total_sent), 1) as avg_campaigns_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
      WHEN h.total_sent = 1 THEN '1 campagne'
      WHEN h.total_sent = 2 THEN '2 campagnes'
      WHEN h.total_sent = 3 THEN '3 campagnes'
      WHEN h.total_sent >= 4 THEN '4+ campagnes'
    END
)
SELECT 
  campaigns_sent_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_campaigns_out,
  avg_campaigns_total
FROM campaigns_sent_analysis
ORDER BY 
  CASE campaigns_sent_category
    WHEN '0 campagne' THEN 0
    WHEN '1 campagne' THEN 1
    WHEN '2 campagnes' THEN 2
    WHEN '3 campagnes' THEN 3
    WHEN '4+ campagnes' THEN 4
  END;

-- 3. Establishment Activity Level Analysis
-- Chart: Stacked bar chart showing housing out by establishment activity level
WITH establishment_activity AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    e.establishment_id,
    ea.typologie_activation_simple,
    ea.type_regroupe,
    e.total_sent_campaigns as establishment_campaigns_sent,
    e.connected_last_60_days
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_establishments e ON h.establishment_ids_array @> ARRAY[e.establishment_id]
  LEFT JOIN dwh.main_marts.marts_production_establishments_activation ea ON e.establishment_id = ea.establishment_id
)
SELECT 
  COALESCE(typologie_activation_simple, 'Non rattaché à un établissement') as establishment_activity_level,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as pct_housing_out
FROM establishment_activity
GROUP BY COALESCE(typologie_activation_simple, 'Non rattaché à un établissement')
ORDER BY pct_housing_out DESC;

-- 4. Establishment Type Analysis
-- Chart: Bar chart showing housing out by establishment type
WITH establishment_type_analysis AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    ea.type_regroupe,
    ea.type_explicite
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_establishments e ON h.establishment_ids_array @> ARRAY[e.establishment_id]
  LEFT JOIN dwh.main_marts.marts_production_establishments_activation ea ON e.establishment_id = ea.establishment_id
)
SELECT 
  COALESCE(type_regroupe, 'Non rattaché') as establishment_type,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as pct_housing_out
FROM establishment_type_analysis
GROUP BY COALESCE(type_regroupe, 'Non rattaché')
ORDER BY pct_housing_out DESC;

-- 5. Campaign Timeline Analysis
-- Chart: Timeline showing housing out by campaign creation/sending dates
WITH campaign_timeline AS (
  SELECT 
    CASE 
      WHEN h.first_campaign_sent IS NULL THEN 'Jamais de campagne envoyée'
      WHEN h.first_campaign_sent >= '2024-01-01' THEN '2024'
      WHEN h.first_campaign_sent >= '2023-01-01' AND h.first_campaign_sent < '2024-01-01' THEN '2023'
      WHEN h.first_campaign_sent >= '2022-01-01' AND h.first_campaign_sent < '2023-01-01' THEN '2022'
      WHEN h.first_campaign_sent >= '2021-01-01' AND h.first_campaign_sent < '2022-01-01' THEN '2021'
      WHEN h.first_campaign_sent < '2021-01-01' THEN 'Avant 2021'
    END as first_campaign_year,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.first_campaign_sent IS NULL THEN 'Jamais de campagne envoyée'
      WHEN h.first_campaign_sent >= '2024-01-01' THEN '2024'
      WHEN h.first_campaign_sent >= '2023-01-01' AND h.first_campaign_sent < '2024-01-01' THEN '2023'
      WHEN h.first_campaign_sent >= '2022-01-01' AND h.first_campaign_sent < '2023-01-01' THEN '2022'
      WHEN h.first_campaign_sent >= '2021-01-01' AND h.first_campaign_sent < '2022-01-01' THEN '2021'
      WHEN h.first_campaign_sent < '2021-01-01' THEN 'Avant 2021'
    END
)
SELECT 
  first_campaign_year,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM campaign_timeline
ORDER BY 
  CASE first_campaign_year
    WHEN 'Jamais de campagne envoyée' THEN 0
    WHEN 'Avant 2021' THEN 1
    WHEN '2021' THEN 2
    WHEN '2022' THEN 3
    WHEN '2023' THEN 4
    WHEN '2024' THEN 5
  END;

-- 6. Groups Analysis
-- Chart: Bar chart showing housing out by group participation
WITH groups_analysis AS (
  SELECT 
    CASE 
      WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
      WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
      WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
      WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
    END as groups_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.total_groups END), 1) as avg_groups_out,
    ROUND(AVG(h.total_groups), 1) as avg_groups_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
      WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
      WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
      WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
    END
)
SELECT 
  groups_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_groups_out,
  avg_groups_total
FROM groups_analysis
ORDER BY 
  CASE groups_category
    WHEN 'Pas dans un groupe' THEN 0
    WHEN 'Dans 1 groupe' THEN 1
    WHEN 'Dans 2 groupes' THEN 2
    WHEN 'Dans 3+ groupes' THEN 3
  END;

-- 7. Territory Coverage Analysis
-- Chart: Bar chart showing housing out by user territory coverage
SELECT 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END as territory_coverage,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 8. Combined Proactivity Score Analysis
-- Chart: Scatter plot showing relationship between different proactivity measures
WITH proactivity_score AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    -- Create a proactivity score based on multiple factors
    COALESCE(h.total_sent, 0) as campaigns_sent,
    COALESCE(h.total_groups, 0) as groups_count,
    CASE WHEN h.is_on_user_teritory THEN 1 ELSE 0 END as on_territory,
    -- Combined score
    COALESCE(h.total_sent, 0) + COALESCE(h.total_groups, 0) + CASE WHEN h.is_on_user_teritory THEN 1 ELSE 0 END as proactivity_score
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
),
proactivity_categories AS (
  SELECT 
    CASE 
      WHEN proactivity_score = 0 THEN 'Aucune action (0)'
      WHEN proactivity_score = 1 THEN 'Action faible (1)'
      WHEN proactivity_score = 2 THEN 'Action modérée (2)'
      WHEN proactivity_score = 3 THEN 'Action élevée (3)'
      WHEN proactivity_score >= 4 THEN 'Action très élevée (4+)'
    END as proactivity_category,
    COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
    COUNT(*) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN is_out THEN proactivity_score END), 1) as avg_score_out,
    ROUND(AVG(proactivity_score), 1) as avg_score_total
  FROM proactivity_score
  GROUP BY 
    CASE 
      WHEN proactivity_score = 0 THEN 'Aucune action (0)'
      WHEN proactivity_score = 1 THEN 'Action faible (1)'
      WHEN proactivity_score = 2 THEN 'Action modérée (2)'
      WHEN proactivity_score = 3 THEN 'Action élevée (3)'
      WHEN proactivity_score >= 4 THEN 'Action très élevée (4+)'
    END
)
SELECT 
  proactivity_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_score_out,
  avg_score_total
FROM proactivity_categories
ORDER BY 
  CASE proactivity_category
    WHEN 'Aucune action (0)' THEN 0
    WHEN 'Action faible (1)' THEN 1
    WHEN 'Action modérée (2)' THEN 2
    WHEN 'Action élevée (3)' THEN 3
    WHEN 'Action très élevée (4+)' THEN 4
  END;

