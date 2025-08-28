-- =====================================================
-- CAMPAIGN EFFECTIVENESS DEEP DIVE
-- Comprehensive Analysis of ZLV Campaign Impact on Vacancy Exit
-- =====================================================

-- 1. Campaign Participation Paradox Analysis
-- Chart: Detailed breakdown explaining why campaign participation shows higher exit rates
WITH campaign_paradox_analysis AS (
  SELECT 
    'Logements dans campagnes' as housing_type,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    -- Additional context metrics
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.total_sent END), 1) as avg_campaigns_sent_out,
    ROUND(AVG(h.total_sent), 1) as avg_campaigns_sent_total,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN 
      DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year END), 1) as avg_vacancy_duration_out,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Logements hors campagnes' as housing_type,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    0 as avg_campaigns_sent_out,
    0 as avg_campaigns_sent_total,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN 
      DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year END), 1) as avg_vacancy_duration_out,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NULL
)
SELECT 
  housing_type,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_campaigns_sent_out,
  avg_campaigns_sent_total,
  avg_vacancy_duration_out,
  avg_vacancy_duration_total,
  -- Calculate the lift
  exit_rate_pct - LAG(exit_rate_pct) OVER (ORDER BY housing_type DESC) as campaign_lift
FROM campaign_paradox_analysis
ORDER BY exit_rate_pct DESC;

-- 2. Territory Coverage Impact Explanation
-- Chart: Multi-dimensional analysis of why territory coverage matters
WITH territory_impact_detailed AS (
  SELECT 
    CASE 
      WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
      WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
      ELSE 'Non renseigné'
    END as territory_status,
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
    -- Context metrics
    ROUND(AVG(CASE WHEN ch.housing_id IS NOT NULL THEN h.total_sent END), 1) as avg_campaigns_when_in_campaign,
    COUNT(DISTINCT CASE WHEN ch.housing_id IS NOT NULL THEN h.housing_id END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_campaigns,
    -- Establishment activity context
    COUNT(DISTINCT CASE WHEN h.establishment_ids_array IS NOT NULL THEN h.housing_id END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_with_establishment
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  GROUP BY 
    CASE 
      WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
      WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
      ELSE 'Non renseigné'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
)
SELECT 
  territory_status,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_campaigns_when_in_campaign,
  ROUND(pct_in_campaigns, 2) as pct_in_campaigns,
  ROUND(pct_with_establishment, 2) as pct_with_establishment
FROM territory_impact_detailed
ORDER BY territory_status, campaign_status;

-- 3. Group Participation Effectiveness Analysis
-- Chart: Understanding why group participation increases exit probability
WITH group_effectiveness_analysis AS (
  SELECT 
    CASE 
      WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
      WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
      WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
      WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
    END as group_category,
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
    -- Context metrics
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.total_sent END), 1) as avg_campaigns_out,
    ROUND(AVG(h.total_sent), 1) as avg_campaigns_total,
    COUNT(DISTINCT CASE WHEN ch.housing_id IS NOT NULL THEN h.housing_id END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_campaigns,
    -- Territory coverage within groups
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  GROUP BY 
    CASE 
      WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
      WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
      WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
      WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
    END,
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
)
SELECT 
  group_category,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_campaigns_out,
  avg_campaigns_total,
  ROUND(pct_in_campaigns, 2) as pct_in_campaigns,
  ROUND(pct_on_territory, 2) as pct_on_territory
FROM group_effectiveness_analysis
ORDER BY 
  CASE group_category
    WHEN 'Pas dans un groupe' THEN 0
    WHEN 'Dans 1 groupe' THEN 1
    WHEN 'Dans 2 groupes' THEN 2
    WHEN 'Dans 3+ groupes' THEN 3
  END,
  campaign_status;

-- 4. Campaign Intensity vs Success Rate Analysis
-- Chart: Detailed analysis of how campaign frequency affects outcomes
WITH campaign_intensity_detailed AS (
  SELECT 
    CASE 
      WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
      WHEN h.total_sent = 1 THEN '1 campagne'
      WHEN h.total_sent = 2 THEN '2 campagnes'
      WHEN h.total_sent = 3 THEN '3 campagnes'
      WHEN h.total_sent >= 4 THEN '4+ campagnes'
    END as campaign_intensity,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    -- Time-based metrics
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN 
      DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year END), 1) as avg_vacancy_duration_out,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration_total,
    -- Campaign timing
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL AND h.first_campaign_sent IS NOT NULL THEN 
      DATE_PART('year', h.first_campaign_sent) - h.vacancy_start_year END), 1) as avg_years_to_first_campaign_out,
    ROUND(AVG(CASE WHEN h.first_campaign_sent IS NOT NULL THEN 
      DATE_PART('year', h.first_campaign_sent) - h.vacancy_start_year END), 1) as avg_years_to_first_campaign_total,
    -- Territory and group context
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory,
    COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_groups
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
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  campaign_intensity,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_vacancy_duration_out,
  avg_vacancy_duration_total,
  avg_years_to_first_campaign_out,
  avg_years_to_first_campaign_total,
  ROUND(pct_on_territory, 2) as pct_on_territory,
  ROUND(pct_in_groups, 2) as pct_in_groups,
  -- Calculate incremental lift
  exit_rate_pct - FIRST_VALUE(exit_rate_pct) OVER (ORDER BY 
    CASE campaign_intensity
      WHEN '0 campagne' THEN 0
      WHEN '1 campagne' THEN 1
      WHEN '2 campagnes' THEN 2
      WHEN '3 campagnes' THEN 3
      WHEN '4+ campagnes' THEN 4
    END
  ) as lift_vs_no_campaign
FROM campaign_intensity_detailed
ORDER BY 
  CASE campaign_intensity
    WHEN '0 campagne' THEN 0
    WHEN '1 campagne' THEN 1
    WHEN '2 campagnes' THEN 2
    WHEN '3 campagnes' THEN 3
    WHEN '4+ campagnes' THEN 4
  END;

-- 5. Selection Bias Analysis
-- Chart: Understanding potential selection bias in campaign targeting
WITH selection_bias_analysis AS (
  SELECT 
    'Logements ciblés par campagnes' as segment,
    -- Housing characteristics
    ROUND(AVG(h.living_area), 1) as avg_living_area,
    ROUND(AVG(h.rooms_count), 1) as avg_rooms_count,
    ROUND(AVG(CASE WHEN h.last_transaction_value IS NOT NULL THEN h.last_transaction_value END), 0) as avg_transaction_value,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration,
    -- Location characteristics
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory,
    COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_groups,
    -- Building characteristics
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    -- Mutation characteristics
    COUNT(CASE WHEN h.last_mutation_date IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_with_mutation,
    COUNT(CASE WHEN h.last_mutation_type = 'sale' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN h.last_mutation_date IS NOT NULL THEN 1 END), 0) as pct_sale_mutations,
    -- Sample size
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Logements non ciblés par campagnes' as segment,
    ROUND(AVG(h.living_area), 1) as avg_living_area,
    ROUND(AVG(h.rooms_count), 1) as avg_rooms_count,
    ROUND(AVG(CASE WHEN h.last_transaction_value IS NOT NULL THEN h.last_transaction_value END), 0) as avg_transaction_value,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year), 1) as avg_vacancy_duration,
    COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_on_territory,
    COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_groups,
    COUNT(CASE WHEN h.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_energy_sieve,
    COUNT(CASE WHEN h.last_mutation_date IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_with_mutation,
    COUNT(CASE WHEN h.last_mutation_type = 'sale' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN h.last_mutation_date IS NOT NULL THEN 1 END), 0) as pct_sale_mutations,
    COUNT(h.housing_id) as sample_size
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE ch.housing_id IS NULL
)
SELECT 
  segment,
  avg_living_area,
  avg_rooms_count,
  avg_transaction_value,
  avg_vacancy_duration,
  ROUND(pct_on_territory, 2) as pct_on_territory,
  ROUND(pct_in_groups, 2) as pct_in_groups,
  ROUND(pct_energy_sieve, 2) as pct_energy_sieve,
  ROUND(pct_with_mutation, 2) as pct_with_mutation,
  ROUND(pct_sale_mutations, 2) as pct_sale_mutations,
  sample_size
FROM selection_bias_analysis
ORDER BY segment DESC;

-- 6. Establishment Activity Impact on Campaign Success
-- Chart: How establishment activity level affects campaign effectiveness
WITH establishment_campaign_analysis AS (
  SELECT 
    COALESCE(ea.typologie_activation_simple, 'Non rattaché') as establishment_activity,
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
    -- Additional context
    ROUND(AVG(CASE WHEN ch.housing_id IS NOT NULL THEN h.total_sent END), 1) as avg_campaigns_when_in_campaign,
    COUNT(DISTINCT CASE WHEN ch.housing_id IS NOT NULL THEN h.housing_id END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0) as pct_in_campaigns
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  LEFT JOIN dwh.main_marts.marts_production_establishments e ON h.establishment_ids_array @> ARRAY[e.establishment_id]
  LEFT JOIN dwh.main_marts.marts_production_establishments_activation ea ON e.establishment_id = ea.establishment_id
  GROUP BY 
    COALESCE(ea.typologie_activation_simple, 'Non rattaché'),
    CASE 
      WHEN ch.housing_id IS NOT NULL THEN 'Avec campagne'
      ELSE 'Sans campagne'
    END
  HAVING COUNT(h.housing_id) >= 100
)
SELECT 
  establishment_activity,
  campaign_status,
  housing_out_count,
  total_housing_count,
  exit_rate_pct,
  avg_campaigns_when_in_campaign,
  ROUND(pct_in_campaigns, 2) as pct_in_campaigns,
  -- Calculate campaign lift within each establishment activity level
  exit_rate_pct - LAG(exit_rate_pct) OVER (
    PARTITION BY establishment_activity 
    ORDER BY campaign_status
  ) as campaign_lift_within_activity
FROM establishment_campaign_analysis
ORDER BY establishment_activity, campaign_status;

-- 7. Time-to-Exit Analysis by Campaign Participation
-- Chart: Understanding how quickly housing exits vacancy with vs without campaigns
WITH time_to_exit_analysis AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    ch.housing_id IS NOT NULL as in_campaign,
    h.vacancy_start_year,
    -- Estimate exit year (using current year as proxy for recent exits)
    CASE 
      WHEN ho.housing_id IS NOT NULL THEN 
        LEAST(DATE_PART('year', CURRENT_DATE), h.vacancy_start_year + 10) -- Cap at 10 years
      ELSE NULL
    END as estimated_exit_year,
    h.first_campaign_sent,
    h.total_sent
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.vacancy_start_year IS NOT NULL
),
exit_timing_analysis AS (
  SELECT 
    CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END as campaign_status,
    CASE 
      WHEN estimated_exit_year IS NULL THEN 'Pas encore sorti'
      WHEN estimated_exit_year - vacancy_start_year <= 1 THEN 'Sortie rapide (≤1 an)'
      WHEN estimated_exit_year - vacancy_start_year <= 3 THEN 'Sortie modérée (2-3 ans)'
      WHEN estimated_exit_year - vacancy_start_year <= 5 THEN 'Sortie lente (4-5 ans)'
      WHEN estimated_exit_year - vacancy_start_year > 5 THEN 'Sortie très lente (>5 ans)'
    END as exit_timing,
    COUNT(*) as housing_count,
    ROUND(AVG(CASE WHEN estimated_exit_year IS NOT NULL THEN 
      estimated_exit_year - vacancy_start_year END), 1) as avg_years_to_exit
  FROM time_to_exit_analysis
  GROUP BY 
    CASE WHEN in_campaign THEN 'Avec campagne' ELSE 'Sans campagne' END,
    CASE 
      WHEN estimated_exit_year IS NULL THEN 'Pas encore sorti'
      WHEN estimated_exit_year - vacancy_start_year <= 1 THEN 'Sortie rapide (≤1 an)'
      WHEN estimated_exit_year - vacancy_start_year <= 3 THEN 'Sortie modérée (2-3 ans)'
      WHEN estimated_exit_year - vacancy_start_year <= 5 THEN 'Sortie lente (4-5 ans)'
      WHEN estimated_exit_year - vacancy_start_year > 5 THEN 'Sortie très lente (>5 ans)'
    END
)
SELECT 
  campaign_status,
  exit_timing,
  housing_count,
  avg_years_to_exit,
  ROUND(housing_count * 100.0 / SUM(housing_count) OVER (PARTITION BY campaign_status), 2) as pct_within_campaign_status
FROM exit_timing_analysis
ORDER BY campaign_status, 
  CASE exit_timing
    WHEN 'Sortie rapide (≤1 an)' THEN 1
    WHEN 'Sortie modérée (2-3 ans)' THEN 2
    WHEN 'Sortie lente (4-5 ans)' THEN 3
    WHEN 'Sortie très lente (>5 ans)' THEN 4
    WHEN 'Pas encore sorti' THEN 5
  END;

-- 8. Key Success Factors Summary
-- Chart: Table summarizing the key factors that drive campaign success
WITH success_factors AS (
  SELECT 
    'Facteur territorial' as factor_category,
    'Sur territoire utilisateur' as factor_value,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size,
    'Logements sur territoire avec utilisateurs actifs' as explanation
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.is_on_user_teritory = TRUE AND ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Facteur groupes',
    'Dans 3+ groupes',
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size,
    'Logements identifiés dans plusieurs groupes thématiques'
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE h.total_groups >= 3 AND ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Facteur mutation',
    'Mutation après début vacance',
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size,
    'Logements avec changement de propriétaire pendant la vacance'
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
  WHERE DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year 
    AND ch.housing_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Facteur campagnes multiples',
    '2+ campagnes envoyées',
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as exit_rate_pct,
    COUNT(h.housing_id) as sample_size,
    'Logements ayant reçu plusieurs campagnes de sensibilisation'
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  WHERE h.total_sent >= 2
)
SELECT 
  factor_category,
  factor_value,
  exit_rate_pct,
  sample_size,
  explanation
FROM success_factors
ORDER BY exit_rate_pct DESC;
