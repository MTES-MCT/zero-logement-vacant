-- =====================================================
-- COMPARATIVE ANALYSIS
-- Housing Out of Vacancy vs Still Vacant - Key Differences
-- =====================================================

-- 1. Overall Summary Statistics
-- Chart: Summary table with key metrics comparison
WITH summary_stats AS (
  SELECT 
    'Housing Out of Vacancy' as housing_status,
    COUNT(*) as count,
    ROUND(AVG(living_area), 1) as avg_living_area,
    ROUND(AVG(rooms_count), 1) as avg_rooms,
    ROUND(AVG(rental_value), 0) as avg_rental_value,
    ROUND(AVG(2024 - building_year), 1) as avg_building_age,
    ROUND(AVG(2024 - vacancy_start_year), 1) as avg_vacancy_duration,
    ROUND(AVG(last_transaction_value), 0) as avg_transaction_value,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    ROUND(AVG(total_groups), 1) as avg_groups,
    SUM(CASE WHEN energy_sieve THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pct_energy_sieve,
    SUM(CASE WHEN is_on_user_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pct_on_territory
  FROM dwh.main_marts.marts_production_housing_out
  
  UNION ALL
  
  SELECT 
    'Still Vacant Housing' as housing_status,
    COUNT(*) as count,
    ROUND(AVG(living_area), 1) as avg_living_area,
    ROUND(AVG(rooms_count), 1) as avg_rooms,
    ROUND(AVG(rental_value), 0) as avg_rental_value,
    ROUND(AVG(2024 - building_year), 1) as avg_building_age,
    ROUND(AVG(2024 - vacancy_start_year), 1) as avg_vacancy_duration,
    ROUND(AVG(last_transaction_value), 0) as avg_transaction_value,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    ROUND(AVG(total_groups), 1) as avg_groups,
    SUM(CASE WHEN energy_sieve THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pct_energy_sieve,
    SUM(CASE WHEN is_on_user_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pct_on_territory
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
)
SELECT * FROM summary_stats
ORDER BY housing_status;

-- 2. Housing Characteristics Comparison
-- Chart: Side-by-side comparison of key characteristics
WITH characteristics_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    housing_kind,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Out of Vacancy'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing_out
  WHERE housing_kind IS NOT NULL
  GROUP BY housing_kind
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    housing_kind,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Still Vacant'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing h
  WHERE housing_kind IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
      WHERE ho.housing_id = h.housing_id
    )
  GROUP BY housing_kind
)
SELECT 
  housing_kind,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN count END) as out_count,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) as out_percentage,
  MAX(CASE WHEN status = 'Still Vacant' THEN count END) as vacant_count,
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as vacant_percentage,
  -- Calculate difference
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as percentage_difference
FROM characteristics_comparison
GROUP BY housing_kind
ORDER BY ABS(percentage_difference) DESC;

-- 3. Geographic Distribution Comparison
-- Chart: Map or bar chart showing regional differences
WITH geographic_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    c.region_code,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Out of Vacancy'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing_out ho
  LEFT JOIN dwh.main_marts.marts_common_cities c ON ho.city_code = c.city_code
  WHERE c.region_code IS NOT NULL
  GROUP BY c.region_code
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    c.region_code,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Still Vacant'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_common_cities c ON h.city_code = c.city_code
  WHERE c.region_code IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
      WHERE ho.housing_id = h.housing_id
    )
  GROUP BY c.region_code
)
SELECT 
  region_code,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN count END) as out_count,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) as out_percentage,
  MAX(CASE WHEN status = 'Still Vacant' THEN count END) as vacant_count,
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as vacant_percentage,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as percentage_difference
FROM geographic_comparison
GROUP BY region_code
ORDER BY ABS(percentage_difference) DESC;

-- 4. Building Age Comparison
-- Chart: Histogram comparison of building ages
WITH age_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    CASE 
      WHEN building_year IS NULL THEN 'Non renseigné'
      WHEN building_year < 1919 THEN 'Avant 1919'
      WHEN building_year >= 1919 AND building_year < 1946 THEN '1919-1945'
      WHEN building_year >= 1946 AND building_year < 1971 THEN '1946-1970'
      WHEN building_year >= 1971 AND building_year < 1991 THEN '1971-1990'
      WHEN building_year >= 1991 AND building_year < 2006 THEN '1991-2005'
      WHEN building_year >= 2006 THEN '2006 et après'
    END as building_period,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Out of Vacancy'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing_out
  GROUP BY 
    CASE 
      WHEN building_year IS NULL THEN 'Non renseigné'
      WHEN building_year < 1919 THEN 'Avant 1919'
      WHEN building_year >= 1919 AND building_year < 1946 THEN '1919-1945'
      WHEN building_year >= 1946 AND building_year < 1971 THEN '1946-1970'
      WHEN building_year >= 1971 AND building_year < 1991 THEN '1971-1990'
      WHEN building_year >= 1991 AND building_year < 2006 THEN '1991-2005'
      WHEN building_year >= 2006 THEN '2006 et après'
    END
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    CASE 
      WHEN building_year IS NULL THEN 'Non renseigné'
      WHEN building_year < 1919 THEN 'Avant 1919'
      WHEN building_year >= 1919 AND building_year < 1946 THEN '1919-1945'
      WHEN building_year >= 1946 AND building_year < 1971 THEN '1946-1970'
      WHEN building_year >= 1971 AND building_year < 1991 THEN '1971-1990'
      WHEN building_year >= 1991 AND building_year < 2006 THEN '1991-2005'
      WHEN building_year >= 2006 THEN '2006 et après'
    END as building_period,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Still Vacant'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
  GROUP BY 
    CASE 
      WHEN building_year IS NULL THEN 'Non renseigné'
      WHEN building_year < 1919 THEN 'Avant 1919'
      WHEN building_year >= 1919 AND building_year < 1946 THEN '1919-1945'
      WHEN building_year >= 1946 AND building_year < 1971 THEN '1946-1970'
      WHEN building_year >= 1971 AND building_year < 1991 THEN '1971-1990'
      WHEN building_year >= 1991 AND building_year < 2006 THEN '1991-2005'
      WHEN building_year >= 2006 THEN '2006 et après'
    END
)
SELECT 
  building_period,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN count END) as out_count,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) as out_percentage,
  MAX(CASE WHEN status = 'Still Vacant' THEN count END) as vacant_count,
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as vacant_percentage,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as percentage_difference
FROM age_comparison
GROUP BY building_period
ORDER BY 
  CASE building_period
    WHEN 'Non renseigné' THEN 0
    WHEN 'Avant 1919' THEN 1
    WHEN '1919-1945' THEN 2
    WHEN '1946-1970' THEN 3
    WHEN '1971-1990' THEN 4
    WHEN '1991-2005' THEN 5
    WHEN '2006 et après' THEN 6
  END;

-- 5. Energy Performance Comparison
-- Chart: Bar chart comparing energy classes
WITH energy_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    COALESCE(energy_consumption_bdnb, 'Non renseigné') as energy_class,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Out of Vacancy'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing_out
  GROUP BY COALESCE(energy_consumption_bdnb, 'Non renseigné')
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    COALESCE(energy_consumption_bdnb, 'Non renseigné') as energy_class,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Still Vacant'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
  GROUP BY COALESCE(energy_consumption_bdnb, 'Non renseigné')
)
SELECT 
  energy_class,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN count END) as out_count,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) as out_percentage,
  MAX(CASE WHEN status = 'Still Vacant' THEN count END) as vacant_count,
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as vacant_percentage,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as percentage_difference
FROM energy_comparison
GROUP BY energy_class
ORDER BY 
  CASE energy_class
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
    WHEN 'F' THEN 6
    WHEN 'G' THEN 7
    WHEN 'Non renseigné' THEN 8
  END;

-- 6. Campaign Activity Comparison
-- Chart: Bar chart comparing campaign participation
WITH campaign_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    CASE 
      WHEN total_sent IS NULL OR total_sent = 0 THEN '0 campagne'
      WHEN total_sent = 1 THEN '1 campagne'
      WHEN total_sent = 2 THEN '2 campagnes'
      WHEN total_sent = 3 THEN '3 campagnes'
      WHEN total_sent >= 4 THEN '4+ campagnes'
    END as campaigns_category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Out of Vacancy'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing_out
  GROUP BY 
    CASE 
      WHEN total_sent IS NULL OR total_sent = 0 THEN '0 campagne'
      WHEN total_sent = 1 THEN '1 campagne'
      WHEN total_sent = 2 THEN '2 campagnes'
      WHEN total_sent = 3 THEN '3 campagnes'
      WHEN total_sent >= 4 THEN '4+ campagnes'
    END
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    CASE 
      WHEN total_sent IS NULL OR total_sent = 0 THEN '0 campagne'
      WHEN total_sent = 1 THEN '1 campagne'
      WHEN total_sent = 2 THEN '2 campagnes'
      WHEN total_sent = 3 THEN '3 campagnes'
      WHEN total_sent >= 4 THEN '4+ campagnes'
    END as campaigns_category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 'Still Vacant'), 2) as percentage
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
  GROUP BY 
    CASE 
      WHEN total_sent IS NULL OR total_sent = 0 THEN '0 campagne'
      WHEN total_sent = 1 THEN '1 campagne'
      WHEN total_sent = 2 THEN '2 campagnes'
      WHEN total_sent = 3 THEN '3 campagnes'
      WHEN total_sent >= 4 THEN '4+ campagnes'
    END
)
SELECT 
  campaigns_category,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN count END) as out_count,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) as out_percentage,
  MAX(CASE WHEN status = 'Still Vacant' THEN count END) as vacant_count,
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as vacant_percentage,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN percentage END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN percentage END) as percentage_difference
FROM campaign_comparison
GROUP BY campaigns_category
ORDER BY 
  CASE campaigns_category
    WHEN '0 campagne' THEN 0
    WHEN '1 campagne' THEN 1
    WHEN '2 campagnes' THEN 2
    WHEN '3 campagnes' THEN 3
    WHEN '4+ campagnes' THEN 4
  END;

-- 7. Policy Territory Comparison
-- Chart: Stacked bar chart comparing policy territory coverage
WITH policy_comparison AS (
  SELECT 
    'Out of Vacancy' as status,
    'OPAH' as policy_type,
    SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing_out
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    'OPAH' as policy_type,
    SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_opah_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
  
  UNION ALL
  
  SELECT 
    'Out of Vacancy' as status,
    'TLV1' as policy_type,
    SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing_out
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    'TLV1' as policy_type,
    SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_tlv1_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
  
  UNION ALL
  
  SELECT 
    'Out of Vacancy' as status,
    'Action Cœur de Ville' as policy_type,
    SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing_out
  
  UNION ALL
  
  SELECT 
    'Still Vacant' as status,
    'Action Cœur de Ville' as policy_type,
    SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) as in_policy,
    COUNT(*) - SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) as not_in_policy,
    ROUND(SUM(CASE WHEN is_in_action_coeur_de_ville_teritory THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_in_policy
  FROM dwh.main_marts.marts_production_housing h
  WHERE NOT EXISTS (
    SELECT 1 FROM dwh.main_marts.marts_production_housing_out ho 
    WHERE ho.housing_id = h.housing_id
  )
)
SELECT 
  policy_type,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN pct_in_policy END) as out_pct_in_policy,
  MAX(CASE WHEN status = 'Still Vacant' THEN pct_in_policy END) as vacant_pct_in_policy,
  MAX(CASE WHEN status = 'Out of Vacancy' THEN pct_in_policy END) - 
  MAX(CASE WHEN status = 'Still Vacant' THEN pct_in_policy END) as percentage_difference
FROM policy_comparison
GROUP BY policy_type
ORDER BY ABS(percentage_difference) DESC;

