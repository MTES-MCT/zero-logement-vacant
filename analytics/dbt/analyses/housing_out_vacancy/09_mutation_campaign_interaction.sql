-- =====================================================
-- MUTATION-CAMPAIGN INTERACTION ANALYSIS
-- Understanding the Combined Impact of Property Mutations and ZLV Campaigns on Vacancy Exit
-- =====================================================

-- 1. Mutation Timing vs Campaign Participation Cross-Analysis
-- Chart: Heatmap showing exit rates by mutation period and campaign participation
WITH mutation_campaign_cross AS (
  SELECT 
    CASE 
      WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
      WHEN h.last_mutation_date >= '2020-01-01' THEN '2020-2024'
      WHEN h.last_mutation_date >= '2015-01-01' AND h.last_mutation_date < '2020-01-01' THEN '2015-2019'
      WHEN h.last_mutation_date >= '2010-01-01' AND h.last_mutation_date < '2015-01-01' THEN '2010-2014'
      WHEN h.last_mutation_date >= '2005-01-01' AND h.last_mutation_date < '2010-01-01' THEN '2005-2009'
      WHEN h.last_mutation_date >= '2000-01-01' AND h.last_mutation_date < '2005-01-01' THEN '2000-2004'
      WHEN h.last_mutation_date < '2000-01-01' THEN 'Avant 2000'
    END as mutation_period,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
      ELSE 'Pas dans une campagne'
    END as campaign_status,
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
      WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
      WHEN h.last_mutation_date >= '2020-01-01' THEN '2020-2024'
      WHEN h.last_mutation_date >= '2015-01-01' AND h.last_mutation_date < '2020-01-01' THEN '2015-2019'
      WHEN h.last_mutation_date >= '2010-01-01' AND h.last_mutation_date < '2015-01-01' THEN '2010-2014'
      WHEN h.last_mutation_date >= '2005-01-01' AND h.last_mutation_date < '2010-01-01' THEN '2005-2009'
      WHEN h.last_mutation_date >= '2000-01-01' AND h.last_mutation_date < '2005-01-01' THEN '2000-2004'
      WHEN h.last_mutation_date < '2000-01-01' THEN 'Avant 2000'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
      ELSE 'Pas dans une campagne'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  mutation_period,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate lift for campaign vs no campaign within each mutation period
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY mutation_period 
    ORDER BY campaign_status DESC
  ) as campaign_lift_within_period
FROM mutation_campaign_cross
ORDER BY 
  CASE mutation_period
    WHEN 'Non renseigné' THEN 0
    WHEN 'Avant 2000' THEN 1
    WHEN '2000-2004' THEN 2
    WHEN '2005-2009' THEN 3
    WHEN '2010-2014' THEN 4
    WHEN '2015-2019' THEN 5
    WHEN '2020-2024' THEN 6
  END,
  campaign_status DESC;

-- 2. Mutation Type vs Campaign Effectiveness
-- Chart: Bar chart showing how campaign effectiveness varies by mutation type
WITH mutation_type_campaign_analysis AS (
  SELECT 
    COALESCE(h.last_mutation_type, 'Non renseigné') as mutation_type,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END as campaign_status,
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
    COALESCE(h.last_mutation_type, 'Non renseigné'),
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
  HAVING COUNT(h.housing_id) >= 50
)
SELECT 
  mutation_type,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate campaign effectiveness by mutation type
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY mutation_type 
    ORDER BY campaign_status
  ) as campaign_lift_by_mutation_type
FROM mutation_type_campaign_analysis
ORDER BY mutation_type, campaign_status;

-- 3. Time Gap Between Mutation and Campaign Impact
-- Chart: Line chart showing how time between mutation and first campaign affects success
WITH mutation_campaign_timing AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    h.last_mutation_date,
    h.first_campaign_sent,
    CASE 
      WHEN h.last_mutation_date IS NULL OR h.first_campaign_sent IS NULL THEN 'Données manquantes'
      WHEN h.first_campaign_sent < h.last_mutation_date THEN 'Campagne avant mutation'
      WHEN DATE_PART('year', h.first_campaign_sent) - DATE_PART('year', h.last_mutation_date) = 0 THEN 'Même année'
      WHEN DATE_PART('year', h.first_campaign_sent) - DATE_PART('year', h.last_mutation_date) = 1 THEN '1 an après'
      WHEN DATE_PART('year', h.first_campaign_sent) - DATE_PART('year', h.last_mutation_date) = 2 THEN '2 ans après'
      WHEN DATE_PART('year', h.first_campaign_sent) - DATE_PART('year', h.last_mutation_date) = 3 THEN '3 ans après'
      WHEN DATE_PART('year', h.first_campaign_sent) - DATE_PART('year', h.last_mutation_date) >= 4 THEN '4+ ans après'
    END as timing_gap
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  WHERE h.first_campaign_sent IS NOT NULL
)
SELECT 
  timing_gap,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as exit_rate_pct
FROM mutation_campaign_timing
GROUP BY timing_gap
HAVING COUNT(*) >= 100
ORDER BY 
  CASE timing_gap
    WHEN 'Données manquantes' THEN 0
    WHEN 'Campagne avant mutation' THEN 1
    WHEN 'Même année' THEN 2
    WHEN '1 an après' THEN 3
    WHEN '2 ans après' THEN 4
    WHEN '3 ans après' THEN 5
    WHEN '4+ ans après' THEN 6
  END;

-- 4. Transaction Value vs Campaign Effectiveness
-- Chart: Scatter plot showing campaign effectiveness by property value ranges
WITH value_campaign_analysis AS (
  SELECT 
    CASE 
      WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
      WHEN h.last_transaction_value < 100000 THEN '< 100k€'
      WHEN h.last_transaction_value >= 100000 AND h.last_transaction_value < 200000 THEN '100k-199k€'
      WHEN h.last_transaction_value >= 200000 AND h.last_transaction_value < 300000 THEN '200k-299k€'
      WHEN h.last_transaction_value >= 300000 AND h.last_transaction_value < 500000 THEN '300k-499k€'
      WHEN h.last_transaction_value >= 500000 THEN '500k€+'
    END as value_range,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END as campaign_status,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    ROUND(AVG(h.last_transaction_value), 0) as avg_transaction_value
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  GROUP BY 
    CASE 
      WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
      WHEN h.last_transaction_value < 100000 THEN '< 100k€'
      WHEN h.last_transaction_value >= 100000 AND h.last_transaction_value < 200000 THEN '100k-199k€'
      WHEN h.last_transaction_value >= 200000 AND h.last_transaction_value < 300000 THEN '200k-299k€'
      WHEN h.last_transaction_value >= 300000 AND h.last_transaction_value < 500000 THEN '300k-499k€'
      WHEN h.last_transaction_value >= 500000 THEN '500k€+'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  value_range,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_transaction_value,
  -- Calculate campaign lift by value range
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY value_range 
    ORDER BY campaign_status
  ) as campaign_lift_by_value
FROM value_campaign_analysis
ORDER BY 
  CASE value_range
    WHEN 'Non renseigné' THEN 0
    WHEN '< 100k€' THEN 1
    WHEN '100k-199k€' THEN 2
    WHEN '200k-299k€' THEN 3
    WHEN '300k-499k€' THEN 4
    WHEN '500k€+' THEN 5
  END,
  campaign_status;

-- 5. Mutation-Vacancy Timing vs Campaign Success
-- Chart: Heatmap showing success rates by mutation-vacancy timing and campaign participation
WITH mutation_vacancy_campaign_analysis AS (
  SELECT 
    CASE 
      WHEN h.last_mutation_date IS NULL OR h.vacancy_start_year IS NULL THEN 'Données manquantes'
      WHEN DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year THEN 'Mutation après vacance'
      WHEN DATE_PART('year', h.last_mutation_date) = h.vacancy_start_year THEN 'Mutation même année'
      WHEN DATE_PART('year', h.last_mutation_date) < h.vacancy_start_year THEN 'Mutation avant vacance'
    END as mutation_vacancy_timing,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END as campaign_status,
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
      WHEN h.last_mutation_date IS NULL OR h.vacancy_start_year IS NULL THEN 'Données manquantes'
      WHEN DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year THEN 'Mutation après vacance'
      WHEN DATE_PART('year', h.last_mutation_date) = h.vacancy_start_year THEN 'Mutation même année'
      WHEN DATE_PART('year', h.last_mutation_date) < h.vacancy_start_year THEN 'Mutation avant vacance'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  mutation_vacancy_timing,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  -- Calculate campaign effectiveness by mutation timing
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY mutation_vacancy_timing 
    ORDER BY campaign_status
  ) as campaign_lift_by_timing
FROM mutation_vacancy_campaign_analysis
ORDER BY 
  CASE mutation_vacancy_timing
    WHEN 'Données manquantes' THEN 0
    WHEN 'Mutation avant vacance' THEN 1
    WHEN 'Mutation même année' THEN 2
    WHEN 'Mutation après vacance' THEN 3
  END,
  campaign_status;

-- 6. Recent Mutations and Campaign Responsiveness
-- Chart: Bar chart showing how recent mutations respond to campaigns
WITH recent_mutation_analysis AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    ch.housing_id IS NOT NULL as in_campaign,
    CASE 
      WHEN h.last_mutation_date IS NULL THEN 'Pas de mutation connue'
      WHEN h.last_mutation_date >= '2022-01-01' THEN 'Mutation récente (2022+)'
      WHEN h.last_mutation_date >= '2018-01-01' AND h.last_mutation_date < '2022-01-01' THEN 'Mutation moyennement récente (2018-2021)'
      WHEN h.last_mutation_date < '2018-01-01' THEN 'Mutation ancienne (avant 2018)'
    END as mutation_recency
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
)
SELECT 
  mutation_recency,
  CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END as campaign_status,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as exit_rate_pct,
  -- Calculate campaign effectiveness by mutation recency
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) - LAG(ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  )) OVER (
    PARTITION BY mutation_recency 
    ORDER BY CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END
  ) as campaign_lift
FROM recent_mutation_analysis
GROUP BY 
  mutation_recency,
  CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END
HAVING COUNT(*) >= 100
ORDER BY 
  CASE mutation_recency
    WHEN 'Pas de mutation connue' THEN 0
    WHEN 'Mutation ancienne (avant 2018)' THEN 1
    WHEN 'Mutation moyennement récente (2018-2021)' THEN 2
    WHEN 'Mutation récente (2022+)' THEN 3
  END,
  campaign_status;

-- 7. Combined Mutation-Campaign Score Analysis
-- Chart: Scatter plot showing relationship between mutation characteristics and campaign success
WITH mutation_campaign_score AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    -- Mutation score (higher = more recent/valuable)
    CASE 
      WHEN h.last_mutation_date IS NULL THEN 0
      WHEN h.last_mutation_date >= '2020-01-01' THEN 3
      WHEN h.last_mutation_date >= '2015-01-01' THEN 2
      WHEN h.last_mutation_date >= '2010-01-01' THEN 1
      ELSE 0
    END +
    CASE 
      WHEN h.last_transaction_value IS NULL THEN 0
      WHEN h.last_transaction_value >= 300000 THEN 2
      WHEN h.last_transaction_value >= 150000 THEN 1
      ELSE 0
    END +
    CASE 
      WHEN h.last_mutation_type = 'sale' THEN 2
      WHEN h.last_mutation_type = 'donation' THEN 1
      ELSE 0
    END as mutation_score,
    -- Campaign score
    COALESCE(h.total_sent, 0) as campaign_score
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
),
score_categories AS (
  SELECT 
    CASE 
      WHEN mutation_score = 0 THEN 'Mutation faible (0)'
      WHEN mutation_score >= 1 AND mutation_score <= 2 THEN 'Mutation modérée (1-2)'
      WHEN mutation_score >= 3 AND mutation_score <= 4 THEN 'Mutation élevée (3-4)'
      WHEN mutation_score >= 5 THEN 'Mutation très élevée (5+)'
    END as mutation_category,
    CASE 
      WHEN campaign_score = 0 THEN 'Aucune campagne'
      WHEN campaign_score = 1 THEN '1 campagne'
      WHEN campaign_score = 2 THEN '2 campagnes'
      WHEN campaign_score >= 3 THEN '3+ campagnes'
    END as campaign_category,
    COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
    COUNT(*) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as exit_rate_pct
  FROM mutation_campaign_score
  GROUP BY 
    CASE 
      WHEN mutation_score = 0 THEN 'Mutation faible (0)'
      WHEN mutation_score >= 1 AND mutation_score <= 2 THEN 'Mutation modérée (1-2)'
      WHEN mutation_score >= 3 AND mutation_score <= 4 THEN 'Mutation élevée (3-4)'
      WHEN mutation_score >= 5 THEN 'Mutation très élevée (5+)'
    END,
    CASE 
      WHEN campaign_score = 0 THEN 'Aucune campagne'
      WHEN campaign_score = 1 THEN '1 campagne'
      WHEN campaign_score = 2 THEN '2 campagnes'
      WHEN campaign_score >= 3 THEN '3+ campagnes'
    END
  HAVING COUNT(*) >= 50
)
SELECT 
  mutation_category,
  campaign_category,
  housing_out_count,
  total_housing_count,
  exit_rate_pct
FROM score_categories
ORDER BY 
  CASE mutation_category
    WHEN 'Mutation faible (0)' THEN 0
    WHEN 'Mutation modérée (1-2)' THEN 1
    WHEN 'Mutation élevée (3-4)' THEN 2
    WHEN 'Mutation très élevée (5+)' THEN 3
  END,
  CASE campaign_category
    WHEN 'Aucune campagne' THEN 0
    WHEN '1 campagne' THEN 1
    WHEN '2 campagnes' THEN 2
    WHEN '3+ campagnes' THEN 3
  END;

-- 8. Key Insights Summary
-- Chart: Table summarizing key findings about mutation-campaign interactions
WITH key_insights AS (
  -- Insight 1: Overall campaign effectiveness by mutation presence
  SELECT 
    'Impact global des campagnes selon présence de mutation' as insight_category,
    CASE 
      WHEN h.last_mutation_date IS NOT NULL THEN 'Avec mutation connue'
      ELSE 'Sans mutation connue'
    END as segment,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END as treatment,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  GROUP BY 
    CASE 
      WHEN h.last_mutation_date IS NOT NULL THEN 'Avec mutation connue'
      ELSE 'Sans mutation connue'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
  
  UNION ALL
  
  -- Insight 2: Best performing mutation-campaign combination
  SELECT 
    'Meilleure combinaison mutation-campagne' as insight_category,
    'Mutation après début vacance' as segment,
    'Avec campagne' as treatment,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year
    AND ch.housing_id IS NOT NULL
)
SELECT 
  insight_category,
  segment,
  treatment,
  exit_rate_pct,
  sample_size
FROM key_insights
ORDER BY exit_rate_pct DESC;
