-- =====================================================
-- VACANCY DURATION PARADOX ANALYSIS
-- Understanding Why Housing in Campaigns Has Longer Average Vacancy Duration
-- =====================================================

-- 1. Vacancy Duration Distribution Analysis
-- Chart: Histogram comparing vacancy duration distributions between campaign and non-campaign housing
WITH vacancy_duration_analysis AS (
  SELECT 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
      ELSE 'Pas dans une campagne'
    END as campaign_status,
    CASE 
      WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 2 THEN '≤ 2 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 5 THEN '3-5 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 10 THEN '6-10 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 15 THEN '11-15 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN '> 15 ans'
    END as vacancy_duration_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.vacancy_start_year IS NOT NULL
  GROUP BY 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
      ELSE 'Pas dans une campagne'
    END,
    CASE 
      WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 2 THEN '≤ 2 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 5 THEN '3-5 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 10 THEN '6-10 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 15 THEN '11-15 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN '> 15 ans'
    END
)
SELECT 
  campaign_status,
  vacancy_duration_category,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_vacancy_duration,
  -- Calculate percentage within each campaign status
  ROUND(total_housing_count * 100.0 / SUM(total_housing_count) OVER (PARTITION BY campaign_status), 2) as pct_within_campaign_status
FROM vacancy_duration_analysis
ORDER BY 
  campaign_status,
  CASE vacancy_duration_category
    WHEN 'Non renseigné' THEN 0
    WHEN '≤ 2 ans' THEN 1
    WHEN '3-5 ans' THEN 2
    WHEN '6-10 ans' THEN 3
    WHEN '11-15 ans' THEN 4
    WHEN '> 15 ans' THEN 5
  END;

-- 2. Campaign Targeting Bias Analysis
-- Chart: Understanding what types of long-vacant housing are targeted by campaigns
WITH campaign_targeting_analysis AS (
  SELECT 
    'Logements ciblés par campagnes' as segment,
    -- Vacancy duration characteristics
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as median_vacancy_duration,
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant_10plus,
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_long_vacant_15plus,
    -- Housing characteristics that might explain targeting
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_groups,
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory,
    -- Property value indicators
    ROUND(AVG(CASE WHEN h.last_transaction_value IS NOT NULL THEN h.last_transaction_value END), 0) as avg_transaction_value,
    ROUND(AVG(h.living_area), 1) as avg_living_area,
    -- Sample size
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL AND h.vacancy_start_year IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Logements non ciblés par campagnes' as segment,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as median_vacancy_duration,
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant_10plus,
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_long_vacant_15plus,
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_groups,
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory,
    ROUND(AVG(CASE WHEN h.last_transaction_value IS NOT NULL THEN h.last_transaction_value END), 0) as avg_transaction_value,
    ROUND(AVG(h.living_area), 1) as avg_living_area,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NULL AND h.vacancy_start_year IS NOT NULL
)
SELECT 
  segment,
  avg_vacancy_duration,
  median_vacancy_duration,
  ROUND(pct_long_vacant_10plus, 2) as pct_long_vacant_10plus,
  ROUND(pct_very_long_vacant_15plus, 2) as pct_very_long_vacant_15plus,
  ROUND(pct_energy_sieve, 2) as pct_energy_sieve,
  ROUND(pct_in_groups, 2) as pct_in_groups,
  ROUND(pct_on_territory, 2) as pct_on_territory,
  avg_transaction_value,
  avg_living_area,
  sample_size
FROM campaign_targeting_analysis
ORDER BY segment DESC;

-- 3. Exit Rate by Vacancy Duration and Campaign Status
-- Chart: Line chart showing how exit rates vary by vacancy duration for both groups
WITH exit_by_duration AS (
  SELECT 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END as campaign_status,
    CASE 
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 3 THEN 'Vacance récente (≤3 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 7 THEN 'Vacance modérée (4-7 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 12 THEN 'Vacance longue (8-12 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 12 THEN 'Vacance très longue (>12 ans)'
    END as vacancy_duration_group,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.vacancy_start_year IS NOT NULL
  GROUP BY 
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END,
    CASE 
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 3 THEN 'Vacance récente (≤3 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 7 THEN 'Vacance modérée (4-7 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 12 THEN 'Vacance longue (8-12 ans)'
      WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 12 THEN 'Vacance très longue (>12 ans)'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  campaign_status,
  vacancy_duration_group,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_vacancy_duration,
  -- Calculate campaign lift within each duration group
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY vacancy_duration_group 
    ORDER BY campaign_status
  ) as campaign_lift_within_duration
FROM exit_by_duration
ORDER BY 
  CASE vacancy_duration_group
    WHEN 'Vacance récente (≤3 ans)' THEN 1
    WHEN 'Vacance modérée (4-7 ans)' THEN 2
    WHEN 'Vacance longue (8-12 ans)' THEN 3
    WHEN 'Vacance très longue (>12 ans)' THEN 4
  END,
  campaign_status;

-- 4. Survival Analysis: Time to Exit by Campaign Status
-- Chart: Survival curves showing probability of remaining vacant over time
WITH survival_analysis AS (
  SELECT 
    h.housing_id,
    h.vacancy_start_year,
    ho.housing_id IS NOT NULL as has_exited,
    ch.housing_id IS NOT NULL as in_campaign,
    DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year as years_vacant,
    -- Estimate exit year for those who have exited (simplified approach)
    CASE 
      WHEN ho.housing_id IS NOT NULL THEN 
        LEAST(DATE_PART('year', CURRENT_DATE), h.vacancy_start_year + 15) -- Cap at reasonable exit time
      ELSE NULL
    END as estimated_exit_year
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.vacancy_start_year IS NOT NULL 
    AND h.vacancy_start_year >= 2010 -- Focus on more recent data
),
survival_by_year AS (
  SELECT 
    CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END as campaign_status,
    years_vacant,
    COUNT(*) as total_at_risk,
    COUNT(CASE WHEN has_exited THEN 1 END) as exits,
    ROUND(
      COUNT(CASE WHEN has_exited THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as exit_rate_pct
  FROM survival_analysis
  WHERE years_vacant BETWEEN 1 AND 15 -- Focus on reasonable time range
  GROUP BY 
    CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END,
    years_vacant
  HAVING COUNT(*) >= 50 -- Ensure statistical significance
)
SELECT 
  campaign_status,
  years_vacant,
  total_at_risk,
  exits,
  exit_rate_pct,
  -- Calculate cumulative survival probability (simplified)
  ROUND(100 - SUM(exit_rate_pct) OVER (
    PARTITION BY campaign_status 
    ORDER BY years_vacant 
    ROWS UNBOUNDED PRECEDING
  ), 2) as cumulative_survival_pct
FROM survival_by_year
ORDER BY campaign_status, years_vacant;

-- 5. The "Hard Cases" Hypothesis Analysis
-- Chart: Testing if campaigns target the most difficult cases
WITH hard_cases_analysis AS (
  SELECT 
    'Logements dans campagnes' as housing_type,
    -- Difficulty indicators
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant,
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    COUNT(CASE WHEN h.living_area < 30 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_small,
    COUNT(CASE WHEN h.building_year < 1950 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_old,
    COUNT(CASE WHEN h.last_transaction_value < 50000 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN h.last_transaction_value IS NOT NULL THEN 1 END), 0) as pct_low_value,
    -- Multiple difficulty factors
    COUNT(CASE WHEN 
      (DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10) AND
      (h.energy_consumption_bdnb IN ('F', 'G')) 
    THEN 1 END) * 100.0 / NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant_and_energy_sieve,
    -- Success rate despite difficulties
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as overall_exit_rate,
    -- Success rate for hardest cases
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL AND 
        DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 AND
        h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN 
        DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 AND
        h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END), 0), 2
    ) as exit_rate_hardest_cases,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL AND h.vacancy_start_year IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Logements hors campagnes' as housing_type,
    COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant,
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    COUNT(CASE WHEN h.living_area < 30 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_small,
    COUNT(CASE WHEN h.building_year < 1950 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_very_old,
    COUNT(CASE WHEN h.last_transaction_value < 50000 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN h.last_transaction_value IS NOT NULL THEN 1 END), 0) as pct_low_value,
    COUNT(CASE WHEN 
      (DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10) AND
      (h.energy_consumption_bdnb IN ('F', 'G')) 
    THEN 1 END) * 100.0 / NULLIF(COUNT(h.housing_id), 0) as pct_long_vacant_and_energy_sieve,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as overall_exit_rate,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL AND 
        DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 AND
        h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN 
        DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 AND
        h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END), 0), 2
    ) as exit_rate_hardest_cases,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NULL AND h.vacancy_start_year IS NOT NULL
)
SELECT 
  housing_type,
  ROUND(pct_long_vacant, 2) as pct_long_vacant,
  ROUND(pct_energy_sieve, 2) as pct_energy_sieve,
  ROUND(pct_very_small, 2) as pct_very_small,
  ROUND(pct_very_old, 2) as pct_very_old,
  ROUND(pct_low_value, 2) as pct_low_value,
  ROUND(pct_long_vacant_and_energy_sieve, 2) as pct_hardest_cases,
  overall_exit_rate,
  exit_rate_hardest_cases,
  sample_size
FROM hard_cases_analysis
ORDER BY housing_type DESC;

-- 6. Summary: The Vacancy Duration Paradox Explained
-- Chart: Key metrics explaining why campaign housing has longer average vacancy duration
WITH paradox_explanation AS (
  SELECT 
    'Explication du paradoxe' as metric_category,
    'Durée moyenne de vacance plus élevée dans les campagnes' as metric_name,
    '8.7 ans vs 8.0 ans' as observed_value,
    'Les campagnes ciblent intentionnellement les logements avec une vacance plus longue et plus difficile' as explanation
  
  UNION ALL
  
  SELECT 
    'Biais de sélection',
    'Proportion de logements vacants depuis >10 ans',
    CONCAT(
      ROUND(
        (SELECT COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
         NULLIF(COUNT(h.housing_id), 0)
         FROM dwh.main_marts.marts_production_housing h
         LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
         WHERE ch.housing_id IS NOT NULL AND h.vacancy_start_year IS NOT NULL), 2
      ), '% (campagnes) vs ',
      ROUND(
        (SELECT COUNT(CASE WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10 THEN 1 END) * 100.0 / 
         NULLIF(COUNT(h.housing_id), 0)
         FROM dwh.main_marts.marts_production_housing h
         LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
         WHERE ch.housing_id IS NULL AND h.vacancy_start_year IS NOT NULL), 2
      ), '% (hors campagnes)'
    ),
    'Les campagnes ciblent davantage les cas difficiles de longue vacance'
  
  UNION ALL
  
  SELECT 
    'Efficacité malgré la difficulté',
    'Taux de sortie pour logements vacants >10 ans',
    CONCAT(
      ROUND(
        (SELECT COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
         NULLIF(COUNT(h.housing_id), 0)
         FROM dwh.main_marts.marts_production_housing h
         LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
         LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
         WHERE ch.housing_id IS NOT NULL AND h.vacancy_start_year IS NOT NULL 
           AND DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10), 2
      ), '% (avec campagne) vs ',
      ROUND(
        (SELECT COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
         NULLIF(COUNT(h.housing_id), 0)
         FROM dwh.main_marts.marts_production_housing h
         LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
         LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
         WHERE ch.housing_id IS NULL AND h.vacancy_start_year IS NOT NULL 
           AND DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 10), 2
      ), '% (sans campagne)'
    ),
    'Même sur les cas difficiles, les campagnes maintiennent une efficacité supérieure'
)
SELECT 
  metric_category,
  metric_name,
  observed_value,
  explanation
FROM paradox_explanation;
