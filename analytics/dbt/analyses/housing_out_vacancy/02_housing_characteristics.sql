-- =====================================================
-- HOUSING CHARACTERISTICS ANALYSIS
-- Housing Out of Vacancy vs Total Stock
-- =====================================================

-- 1. Housing Type Distribution
-- Chart: Stacked bar chart showing housing types
SELECT 
  h.housing_kind,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
WHERE h.housing_kind IS NOT NULL
GROUP BY h.housing_kind
ORDER BY housing_out_count DESC;

-- 2. Rooms Count Distribution
-- Chart: Histogram showing distribution by number of rooms
WITH rooms_distribution AS (
  SELECT 
    CASE 
      WHEN h.rooms_count IS NULL THEN 'Non renseigné'
      WHEN h.rooms_count <= 1 THEN '1 pièce'
      WHEN h.rooms_count = 2 THEN '2 pièces'
      WHEN h.rooms_count = 3 THEN '3 pièces'
      WHEN h.rooms_count = 4 THEN '4 pièces'
      WHEN h.rooms_count = 5 THEN '5 pièces'
      WHEN h.rooms_count >= 6 THEN '6+ pièces'
    END as rooms_category,
    h.rooms_count,
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
      WHEN h.rooms_count IS NULL THEN 'Non renseigné'
      WHEN h.rooms_count <= 1 THEN '1 pièce'
      WHEN h.rooms_count = 2 THEN '2 pièces'
      WHEN h.rooms_count = 3 THEN '3 pièces'
      WHEN h.rooms_count = 4 THEN '4 pièces'
      WHEN h.rooms_count = 5 THEN '5 pièces'
      WHEN h.rooms_count >= 6 THEN '6+ pièces'
    END,
    h.rooms_count
)
SELECT 
  rooms_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM rooms_distribution
ORDER BY 
  CASE rooms_category
    WHEN 'Non renseigné' THEN 0
    WHEN '1 pièce' THEN 1
    WHEN '2 pièces' THEN 2
    WHEN '3 pièces' THEN 3
    WHEN '4 pièces' THEN 4
    WHEN '5 pièces' THEN 5
    WHEN '6+ pièces' THEN 6
  END;

-- 3. Living Area Distribution
-- Chart: Histogram with living area ranges
WITH area_distribution AS (
  SELECT 
    CASE 
      WHEN h.living_area IS NULL THEN 'Non renseigné'
      WHEN h.living_area < 30 THEN '< 30 m²'
      WHEN h.living_area >= 30 AND h.living_area < 50 THEN '30-49 m²'
      WHEN h.living_area >= 50 AND h.living_area < 70 THEN '50-69 m²'
      WHEN h.living_area >= 70 AND h.living_area < 90 THEN '70-89 m²'
      WHEN h.living_area >= 90 AND h.living_area < 120 THEN '90-119 m²'
      WHEN h.living_area >= 120 THEN '120+ m²'
    END as area_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    -- Statistics
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.living_area END), 1) as avg_area_out,
    ROUND(AVG(h.living_area), 1) as avg_area_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.living_area IS NULL THEN 'Non renseigné'
      WHEN h.living_area < 30 THEN '< 30 m²'
      WHEN h.living_area >= 30 AND h.living_area < 50 THEN '30-49 m²'
      WHEN h.living_area >= 50 AND h.living_area < 70 THEN '50-69 m²'
      WHEN h.living_area >= 70 AND h.living_area < 90 THEN '70-89 m²'
      WHEN h.living_area >= 90 AND h.living_area < 120 THEN '90-119 m²'
      WHEN h.living_area >= 120 THEN '120+ m²'
    END
)
SELECT 
  area_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_area_out,
  avg_area_total
FROM area_distribution
ORDER BY 
  CASE area_category
    WHEN 'Non renseigné' THEN 0
    WHEN '< 30 m²' THEN 1
    WHEN '30-49 m²' THEN 2
    WHEN '50-69 m²' THEN 3
    WHEN '70-89 m²' THEN 4
    WHEN '90-119 m²' THEN 5
    WHEN '120+ m²' THEN 6
  END;

-- 4. Plot Area Analysis
-- Chart: Box plot or histogram for plot areas
WITH plot_area_stats AS (
  SELECT 
    CASE 
      WHEN h.plot_area IS NULL THEN 'Non renseigné'
      WHEN h.plot_area < 200 THEN '< 200 m²'
      WHEN h.plot_area >= 200 AND h.plot_area < 500 THEN '200-499 m²'
      WHEN h.plot_area >= 500 AND h.plot_area < 1000 THEN '500-999 m²'
      WHEN h.plot_area >= 1000 AND h.plot_area < 2000 THEN '1000-1999 m²'
      WHEN h.plot_area >= 2000 THEN '2000+ m²'
    END as plot_area_category,
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
      WHEN h.plot_area IS NULL THEN 'Non renseigné'
      WHEN h.plot_area < 200 THEN '< 200 m²'
      WHEN h.plot_area >= 200 AND h.plot_area < 500 THEN '200-499 m²'
      WHEN h.plot_area >= 500 AND h.plot_area < 1000 THEN '500-999 m²'
      WHEN h.plot_area >= 1000 AND h.plot_area < 2000 THEN '1000-1999 m²'
      WHEN h.plot_area >= 2000 THEN '2000+ m²'
    END
)
SELECT 
  plot_area_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM plot_area_stats
ORDER BY 
  CASE plot_area_category
    WHEN 'Non renseigné' THEN 0
    WHEN '< 200 m²' THEN 1
    WHEN '200-499 m²' THEN 2
    WHEN '500-999 m²' THEN 3
    WHEN '1000-1999 m²' THEN 4
    WHEN '2000+ m²' THEN 5
  END;

-- 5. Cadastral Classification Analysis
-- Chart: Bar chart showing different cadastral classifications
SELECT 
  h.cadastral_classification,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
WHERE h.cadastral_classification IS NOT NULL
GROUP BY h.cadastral_classification
ORDER BY housing_out_count DESC;

-- 6. Condominium vs Individual Housing
-- Chart: Pie chart or bar chart
SELECT 
  CASE 
    WHEN h.condominium = TRUE THEN 'Copropriété'
    WHEN h.condominium = FALSE THEN 'Individuel'
    ELSE 'Non renseigné'
  END as housing_ownership_type,
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
    WHEN h.condominium = TRUE THEN 'Copropriété'
    WHEN h.condominium = FALSE THEN 'Individuel'
    ELSE 'Non renseigné'
  END
ORDER BY housing_out_count DESC;

-- 7. Rental Value Analysis
-- Chart: Box plot or histogram
WITH rental_value_stats AS (
  SELECT 
    CASE 
      WHEN h.rental_value IS NULL THEN 'Non renseigné'
      WHEN h.rental_value < 200 THEN '< 200€'
      WHEN h.rental_value >= 200 AND h.rental_value < 400 THEN '200-399€'
      WHEN h.rental_value >= 400 AND h.rental_value < 600 THEN '400-599€'
      WHEN h.rental_value >= 600 AND h.rental_value < 800 THEN '600-799€'
      WHEN h.rental_value >= 800 AND h.rental_value < 1200 THEN '800-1199€'
      WHEN h.rental_value >= 1200 THEN '1200€+'
    END as rental_value_category,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN ho.housing_id IS NOT NULL THEN h.rental_value END), 0) as avg_rental_out,
    ROUND(AVG(h.rental_value), 0) as avg_rental_total
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    CASE 
      WHEN h.rental_value IS NULL THEN 'Non renseigné'
      WHEN h.rental_value < 200 THEN '< 200€'
      WHEN h.rental_value >= 200 AND h.rental_value < 400 THEN '200-399€'
      WHEN h.rental_value >= 400 AND h.rental_value < 600 THEN '400-599€'
      WHEN h.rental_value >= 600 AND h.rental_value < 800 THEN '600-799€'
      WHEN h.rental_value >= 800 AND h.rental_value < 1200 THEN '800-1199€'
      WHEN h.rental_value >= 1200 THEN '1200€+'
    END
)
SELECT 
  rental_value_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_rental_out,
  avg_rental_total
FROM rental_value_stats
ORDER BY 
  CASE rental_value_category
    WHEN 'Non renseigné' THEN 0
    WHEN '< 200€' THEN 1
    WHEN '200-399€' THEN 2
    WHEN '400-599€' THEN 3
    WHEN '600-799€' THEN 4
    WHEN '800-1199€' THEN 5
    WHEN '1200€+' THEN 6
  END;

