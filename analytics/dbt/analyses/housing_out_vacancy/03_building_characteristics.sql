-- =====================================================
-- BUILDING CHARACTERISTICS ANALYSIS
-- Housing Out of Vacancy vs Total Stock
-- =====================================================

-- 1. Building Year Distribution
-- Chart: Histogram showing construction periods
WITH building_year_distribution AS (
  SELECT 
    CASE 
      WHEN h.building_year IS NULL THEN 'Non renseigné'
      WHEN h.building_year < 1919 THEN 'Avant 1919'
      WHEN h.building_year >= 1919 AND h.building_year < 1946 THEN '1919-1945'
      WHEN h.building_year >= 1946 AND h.building_year < 1971 THEN '1946-1970'
      WHEN h.building_year >= 1971 AND h.building_year < 1991 THEN '1971-1990'
      WHEN h.building_year >= 1991 AND h.building_year < 2006 THEN '1991-2005'
      WHEN h.building_year >= 2006 THEN '2006 et après'
    END as building_period,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.building_year END), 0) as avg_year_out,
    ROUND(AVG(h.building_year), 0) as avg_year_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.building_year IS NULL THEN 'Non renseigné'
      WHEN h.building_year < 1919 THEN 'Avant 1919'
      WHEN h.building_year >= 1919 AND h.building_year < 1946 THEN '1919-1945'
      WHEN h.building_year >= 1946 AND h.building_year < 1971 THEN '1946-1970'
      WHEN h.building_year >= 1971 AND h.building_year < 1991 THEN '1971-1990'
      WHEN h.building_year >= 1991 AND h.building_year < 2006 THEN '1991-2005'
      WHEN h.building_year >= 2006 THEN '2006 et après'
    END
)
SELECT 
  building_period,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_year_out,
  avg_year_total
FROM building_year_distribution
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

-- 2. Building Age Analysis
-- Chart: Histogram with building age ranges
WITH building_age_analysis AS (
  SELECT 
    CASE 
      WHEN h.building_year IS NULL THEN 'Non renseigné'
      WHEN (2024 - h.building_year) < 20 THEN 'Moins de 20 ans'
      WHEN (2024 - h.building_year) >= 20 AND (2024 - h.building_year) < 40 THEN '20-39 ans'
      WHEN (2024 - h.building_year) >= 40 AND (2024 - h.building_year) < 60 THEN '40-59 ans'
      WHEN (2024 - h.building_year) >= 60 AND (2024 - h.building_year) < 80 THEN '60-79 ans'
      WHEN (2024 - h.building_year) >= 80 AND (2024 - h.building_year) < 100 THEN '80-99 ans'
      WHEN (2024 - h.building_year) >= 100 THEN '100 ans et plus'
    END as building_age_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN (2024 - h.building_year) END), 1) as avg_age_out,
    ROUND(AVG(2024 - h.building_year), 1) as avg_age_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.building_year IS NULL THEN 'Non renseigné'
      WHEN (2024 - h.building_year) < 20 THEN 'Moins de 20 ans'
      WHEN (2024 - h.building_year) >= 20 AND (2024 - h.building_year) < 40 THEN '20-39 ans'
      WHEN (2024 - h.building_year) >= 40 AND (2024 - h.building_year) < 60 THEN '40-59 ans'
      WHEN (2024 - h.building_year) >= 60 AND (2024 - h.building_year) < 80 THEN '60-79 ans'
      WHEN (2024 - h.building_year) >= 80 AND (2024 - h.building_year) < 100 THEN '80-99 ans'
      WHEN (2024 - h.building_year) >= 100 THEN '100 ans et plus'
    END
)
SELECT 
  building_age_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_age_out,
  avg_age_total
FROM building_age_analysis
ORDER BY 
  CASE building_age_category
    WHEN 'Non renseigné' THEN 0
    WHEN 'Moins de 20 ans' THEN 1
    WHEN '20-39 ans' THEN 2
    WHEN '40-59 ans' THEN 3
    WHEN '60-79 ans' THEN 4
    WHEN '80-99 ans' THEN 5
    WHEN '100 ans et plus' THEN 6
  END;

-- 3. Building Location Analysis
-- Chart: Bar chart showing different building locations
SELECT 
  h.building_location,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
WHERE h.building_location IS NOT NULL
GROUP BY h.building_location
ORDER BY housing_out_count DESC;

-- 4. Uncomfortable Housing Analysis
-- Chart: Pie chart or bar chart
SELECT 
  CASE 
    WHEN h.uncomfortable = TRUE THEN 'Inconfortable'
    WHEN h.uncomfortable = FALSE THEN 'Confortable'
    ELSE 'Non renseigné'
  END as comfort_status,
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
    WHEN h.uncomfortable = TRUE THEN 'Inconfortable'
    WHEN h.uncomfortable = FALSE THEN 'Confortable'
    ELSE 'Non renseigné'
  END
ORDER BY housing_out_count DESC;

-- 5. Vacancy Duration Analysis
-- Chart: Histogram showing vacancy start years and duration
WITH vacancy_duration AS (
  SELECT 
    CASE 
      WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
      WHEN (2024 - h.vacancy_start_year) <= 2 THEN '≤ 2 ans'
      WHEN (2024 - h.vacancy_start_year) > 2 AND (2024 - h.vacancy_start_year) <= 5 THEN '3-5 ans'
      WHEN (2024 - h.vacancy_start_year) > 5 AND (2024 - h.vacancy_start_year) <= 10 THEN '6-10 ans'
      WHEN (2024 - h.vacancy_start_year) > 10 AND (2024 - h.vacancy_start_year) <= 15 THEN '11-15 ans'
      WHEN (2024 - h.vacancy_start_year) > 15 THEN '> 15 ans'
    END as vacancy_duration_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN (2024 - h.vacancy_start_year) END), 1) as avg_duration_out,
    ROUND(AVG(2024 - h.vacancy_start_year), 1) as avg_duration_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
      WHEN (2024 - h.vacancy_start_year) <= 2 THEN '≤ 2 ans'
      WHEN (2024 - h.vacancy_start_year) > 2 AND (2024 - h.vacancy_start_year) <= 5 THEN '3-5 ans'
      WHEN (2024 - h.vacancy_start_year) > 5 AND (2024 - h.vacancy_start_year) <= 10 THEN '6-10 ans'
      WHEN (2024 - h.vacancy_start_year) > 10 AND (2024 - h.vacancy_start_year) <= 15 THEN '11-15 ans'
      WHEN (2024 - h.vacancy_start_year) > 15 THEN '> 15 ans'
    END
)
SELECT 
  vacancy_duration_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_duration_out,
  avg_duration_total
FROM vacancy_duration
ORDER BY 
  CASE vacancy_duration_category
    WHEN 'Non renseigné' THEN 0
    WHEN '≤ 2 ans' THEN 1
    WHEN '3-5 ans' THEN 2
    WHEN '6-10 ans' THEN 3
    WHEN '11-15 ans' THEN 4
    WHEN '> 15 ans' THEN 5
  END;

-- 6. Taxed Housing Analysis
-- Chart: Bar chart showing taxed vs non-taxed housing
SELECT 
  CASE 
    WHEN h.taxed = TRUE THEN 'Taxé'
    WHEN h.taxed = FALSE THEN 'Non taxé'
    ELSE 'Non renseigné'
  END as tax_status,
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
    WHEN h.taxed = TRUE THEN 'Taxé'
    WHEN h.taxed = FALSE THEN 'Non taxé'
    ELSE 'Non renseigné'
  END
ORDER BY housing_out_count DESC;

-- 7. Data Source Analysis
-- Chart: Bar chart showing different data sources
SELECT 
  h.data_source,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
WHERE h.data_source IS NOT NULL
GROUP BY h.data_source
ORDER BY housing_out_count DESC;

