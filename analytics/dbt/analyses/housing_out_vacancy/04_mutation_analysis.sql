-- =====================================================
-- MUTATION ANALYSIS
-- Housing Out of Vacancy vs Total Stock - Transaction Analysis
-- =====================================================

-- 1. Last Mutation Date Analysis
-- Chart: Timeline showing distribution of last mutations
WITH mutation_timeline AS (
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
      WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
      WHEN h.last_mutation_date >= '2020-01-01' THEN '2020-2024'
      WHEN h.last_mutation_date >= '2015-01-01' AND h.last_mutation_date < '2020-01-01' THEN '2015-2019'
      WHEN h.last_mutation_date >= '2010-01-01' AND h.last_mutation_date < '2015-01-01' THEN '2010-2014'
      WHEN h.last_mutation_date >= '2005-01-01' AND h.last_mutation_date < '2010-01-01' THEN '2005-2009'
      WHEN h.last_mutation_date >= '2000-01-01' AND h.last_mutation_date < '2005-01-01' THEN '2000-2004'
      WHEN h.last_mutation_date < '2000-01-01' THEN 'Avant 2000'
    END
)
SELECT 
  mutation_period,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM mutation_timeline
ORDER BY 
  CASE mutation_period
    WHEN 'Non renseigné' THEN 0
    WHEN 'Avant 2000' THEN 1
    WHEN '2000-2004' THEN 2
    WHEN '2005-2009' THEN 3
    WHEN '2010-2014' THEN 4
    WHEN '2015-2019' THEN 5
    WHEN '2020-2024' THEN 6
  END;

-- 2. Time Since Last Mutation Analysis
-- Chart: Histogram showing years since last mutation
WITH time_since_mutation AS (
  SELECT 
    CASE 
      WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 2 THEN '≤ 2 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 2 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 5 THEN '3-5 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 5 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 10 THEN '6-10 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 10 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 15 THEN '11-15 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 15 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 20 THEN '16-20 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 20 THEN '> 20 ans'
    END as years_since_mutation,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL 
                   THEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) END), 1) as avg_years_out,
    ROUND(AVG(DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date)), 1) as avg_years_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 2 THEN '≤ 2 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 2 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 5 THEN '3-5 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 5 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 10 THEN '6-10 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 10 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 15 THEN '11-15 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 15 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) <= 20 THEN '16-20 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', h.last_mutation_date) > 20 THEN '> 20 ans'
    END
)
SELECT 
  years_since_mutation,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_years_out,
  avg_years_total
FROM time_since_mutation
ORDER BY 
  CASE years_since_mutation
    WHEN 'Non renseigné' THEN 0
    WHEN '≤ 2 ans' THEN 1
    WHEN '3-5 ans' THEN 2
    WHEN '6-10 ans' THEN 3
    WHEN '11-15 ans' THEN 4
    WHEN '16-20 ans' THEN 5
    WHEN '> 20 ans' THEN 6
  END;

-- 3. Last Mutation Type Analysis
-- Chart: Bar chart showing different mutation types
SELECT 
  COALESCE(h.last_mutation_type, 'Non renseigné') as mutation_type,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY COALESCE(h.last_mutation_type, 'Non renseigné')
ORDER BY housing_out_count DESC;

-- 4. Last Transaction Value Analysis
-- Chart: Histogram showing transaction value ranges
WITH transaction_value_analysis AS (
  SELECT 
    CASE 
      WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
      WHEN h.last_transaction_value < 50000 THEN '< 50k€'
      WHEN h.last_transaction_value >= 50000 AND h.last_transaction_value < 100000 THEN '50k-99k€'
      WHEN h.last_transaction_value >= 100000 AND h.last_transaction_value < 150000 THEN '100k-149k€'
      WHEN h.last_transaction_value >= 150000 AND h.last_transaction_value < 200000 THEN '150k-199k€'
      WHEN h.last_transaction_value >= 200000 AND h.last_transaction_value < 300000 THEN '200k-299k€'
      WHEN h.last_transaction_value >= 300000 AND h.last_transaction_value < 500000 THEN '300k-499k€'
      WHEN h.last_transaction_value >= 500000 THEN '500k€+'
    END as transaction_value_range,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.last_transaction_value END), 0) as avg_value_out,
    ROUND(AVG(h.last_transaction_value), 0) as avg_value_total,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN ho.housing_id IS NOT NULL THEN h.last_transaction_value END), 0) as median_value_out,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY h.last_transaction_value), 0) as median_value_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
      WHEN h.last_transaction_value < 50000 THEN '< 50k€'
      WHEN h.last_transaction_value >= 50000 AND h.last_transaction_value < 100000 THEN '50k-99k€'
      WHEN h.last_transaction_value >= 100000 AND h.last_transaction_value < 150000 THEN '100k-149k€'
      WHEN h.last_transaction_value >= 150000 AND h.last_transaction_value < 200000 THEN '150k-199k€'
      WHEN h.last_transaction_value >= 200000 AND h.last_transaction_value < 300000 THEN '200k-299k€'
      WHEN h.last_transaction_value >= 300000 AND h.last_transaction_value < 500000 THEN '300k-499k€'
      WHEN h.last_transaction_value >= 500000 THEN '500k€+'
    END
)
SELECT 
  transaction_value_range,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_value_out,
  avg_value_total,
  median_value_out,
  median_value_total
FROM transaction_value_analysis
ORDER BY 
  CASE transaction_value_range
    WHEN 'Non renseigné' THEN 0
    WHEN '< 50k€' THEN 1
    WHEN '50k-99k€' THEN 2
    WHEN '100k-149k€' THEN 3
    WHEN '150k-199k€' THEN 4
    WHEN '200k-299k€' THEN 5
    WHEN '300k-499k€' THEN 6
    WHEN '500k€+' THEN 7
  END;

-- 5. Transaction Value per m² Analysis
-- Chart: Scatter plot showing price per m² vs exit rate
WITH price_per_sqm AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    CASE 
      WHEN h.last_transaction_value IS NULL OR h.living_area IS NULL OR h.living_area = 0 THEN NULL
      ELSE h.last_transaction_value / h.living_area
    END as price_per_sqm
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
),
price_per_sqm_ranges AS (
  SELECT 
    CASE 
      WHEN price_per_sqm IS NULL THEN 'Non calculable'
      WHEN price_per_sqm < 500 THEN '< 500€/m²'
      WHEN price_per_sqm >= 500 AND price_per_sqm < 1000 THEN '500-999€/m²'
      WHEN price_per_sqm >= 1000 AND price_per_sqm < 1500 THEN '1000-1499€/m²'
      WHEN price_per_sqm >= 1500 AND price_per_sqm < 2000 THEN '1500-1999€/m²'
      WHEN price_per_sqm >= 2000 AND price_per_sqm < 3000 THEN '2000-2999€/m²'
      WHEN price_per_sqm >= 3000 THEN '3000€+/m²'
    END as price_per_sqm_range,
    COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
    COUNT(*) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN is_out THEN price_per_sqm END), 0) as avg_price_per_sqm_out,
    ROUND(AVG(price_per_sqm), 0) as avg_price_per_sqm_total
  FROM price_per_sqm
  GROUP BY 
    CASE 
      WHEN price_per_sqm IS NULL THEN 'Non calculable'
      WHEN price_per_sqm < 500 THEN '< 500€/m²'
      WHEN price_per_sqm >= 500 AND price_per_sqm < 1000 THEN '500-999€/m²'
      WHEN price_per_sqm >= 1000 AND price_per_sqm < 1500 THEN '1000-1499€/m²'
      WHEN price_per_sqm >= 1500 AND price_per_sqm < 2000 THEN '1500-1999€/m²'
      WHEN price_per_sqm >= 2000 AND price_per_sqm < 3000 THEN '2000-2999€/m²'
      WHEN price_per_sqm >= 3000 THEN '3000€+/m²'
    END
)
SELECT 
  price_per_sqm_range,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_price_per_sqm_out,
  avg_price_per_sqm_total
FROM price_per_sqm_ranges
ORDER BY 
  CASE price_per_sqm_range
    WHEN 'Non calculable' THEN 0
    WHEN '< 500€/m²' THEN 1
    WHEN '500-999€/m²' THEN 2
    WHEN '1000-1499€/m²' THEN 3
    WHEN '1500-1999€/m²' THEN 4
    WHEN '2000-2999€/m²' THEN 5
    WHEN '3000€+/m²' THEN 6
  END;

-- 6. Correlation between Mutation Date and Vacancy Start
-- Chart: Scatter plot showing relationship between mutation and vacancy timing
WITH mutation_vacancy_correlation AS (
  SELECT 
    CASE 
      WHEN h.last_mutation_date IS NULL OR h.vacancy_start_year IS NULL THEN 'Données manquantes'
      WHEN DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year THEN 'Mutation après début vacance'
      WHEN DATE_PART('year', h.last_mutation_date) = h.vacancy_start_year THEN 'Mutation même année que vacance'
      WHEN DATE_PART('year', h.last_mutation_date) < h.vacancy_start_year THEN 'Mutation avant début vacance'
    END as mutation_vacancy_timing,
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
      WHEN h.last_mutation_date IS NULL OR h.vacancy_start_year IS NULL THEN 'Données manquantes'
      WHEN DATE_PART('year', h.last_mutation_date) > h.vacancy_start_year THEN 'Mutation après début vacance'
      WHEN DATE_PART('year', h.last_mutation_date) = h.vacancy_start_year THEN 'Mutation même année que vacance'
      WHEN DATE_PART('year', h.last_mutation_date) < h.vacancy_start_year THEN 'Mutation avant début vacance'
    END
)
SELECT 
  mutation_vacancy_timing,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM mutation_vacancy_correlation
ORDER BY pct_housing_out DESC;

