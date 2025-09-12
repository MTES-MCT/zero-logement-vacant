-- =====================================================
-- GEOGRAPHIC DISTRIBUTION ANALYSIS
-- Housing Out of Vacancy vs Total Stock
-- =====================================================

-- 1. Regional Distribution
-- Chart: Bar chart comparing housing out vs total stock by region
WITH regional_stats AS (
  SELECT 
    c.region_code,
    -- Housing out of vacancy
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    -- Total housing stock
    COUNT(h.housing_id) as total_housing_count,
    -- Calculate percentage
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_common_cities c ON h.city_code = c.city_code
  WHERE c.region_code IS NOT NULL
  GROUP BY c.region_code
)
SELECT 
  region_code,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  -- Add ranking
  ROW_NUMBER() OVER (ORDER BY housing_out_count DESC) as rank_by_count,
  ROW_NUMBER() OVER (ORDER BY pct_housing_out DESC) as rank_by_percentage
FROM regional_stats
ORDER BY housing_out_count DESC;

-- 2. Departmental Distribution (Top 20)
-- Chart: Horizontal bar chart showing top 20 departments
WITH departmental_stats AS (
  SELECT 
    c.department_code,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_common_cities c ON h.city_code = c.city_code
  WHERE c.department_code IS NOT NULL
  GROUP BY c.department_code
)
SELECT 
  department_code,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM departmental_stats
ORDER BY housing_out_count DESC
LIMIT 20;

-- 3. EPCI Distribution (Top 30)
-- Chart: Scatter plot with housing_out_count vs pct_housing_out
WITH epci_stats AS (
  SELECT 
    c.epci_code,
    c.epci_name,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  LEFT JOIN dwh.main_marts.marts_common_cities c ON h.city_code = c.city_code
  WHERE c.epci_code IS NOT NULL
  GROUP BY c.epci_code, c.epci_name
  HAVING COUNT(h.housing_id) >= 10  -- Filter EPCIs with at least 10 housing units
)
SELECT 
  epci_code,
  epci_name,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM epci_stats
ORDER BY housing_out_count DESC
LIMIT 30;

-- 4. Urban Unit Analysis
-- Chart: Bar chart comparing urban vs rural areas
SELECT 
  CASE 
    WHEN c.uu_name IS NOT NULL THEN 'Urban Unit'
    ELSE 'Rural/Other'
  END as area_type,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
LEFT JOIN dwh.main_marts.marts_common_cities c ON h.city_code = c.city_code
GROUP BY 
  CASE 
    WHEN c.uu_name IS NOT NULL THEN 'Urban Unit'
    ELSE 'Rural/Other'
  END
ORDER BY housing_out_count DESC;

