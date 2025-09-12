-- =====================================================
-- OWNER DEMOGRAPHICS ANALYSIS
-- Characteristics of Owners with Housing Out of Vacancy
-- =====================================================

-- 1. Owner Type Analysis
-- Chart: Bar chart showing owner types and their housing exit rates
WITH owner_type_analysis AS (
  SELECT 
    COALESCE(o.kind_class, 'Non renseigné') as owner_type,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(DISTINCT o.owner_id) as total_owners,
    ROUND(
      COUNT(DISTINCT oho.owner_id) * 100.0 / 
      NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
    ) as pct_owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out,
    ROUND(AVG(CASE WHEN oho.owner_id IS NOT NULL THEN oho.total_sent END), 1) as avg_campaigns_received
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  GROUP BY COALESCE(o.kind_class, 'Non renseigné')
)
SELECT 
  owner_type,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  total_housing_out,
  avg_campaigns_received,
  ROW_NUMBER() OVER (ORDER BY pct_owners_with_housing_out DESC) as effectiveness_rank
FROM owner_type_analysis
ORDER BY pct_owners_with_housing_out DESC;

-- 2. Owner Kind Detail Analysis
-- Chart: Horizontal bar chart showing detailed owner categories
WITH owner_detail_analysis AS (
  SELECT 
    COALESCE(o.owner_kind_detail, 'Non renseigné') as owner_kind_detail,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(DISTINCT o.owner_id) as total_owners,
    ROUND(
      COUNT(DISTINCT oho.owner_id) * 100.0 / 
      NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
    ) as pct_owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  GROUP BY COALESCE(o.owner_kind_detail, 'Non renseigné')
  HAVING COUNT(DISTINCT o.owner_id) >= 10  -- Filter for statistical significance
)
SELECT 
  owner_kind_detail,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  total_housing_out
FROM owner_detail_analysis
ORDER BY pct_owners_with_housing_out DESC;

-- 3. Owner Age Analysis (for individual owners)
-- Chart: Histogram showing age distribution and housing exit rates
WITH owner_age_analysis AS (
  SELECT 
    o.owner_id,
    oho.owner_id IS NOT NULL as has_housing_out,
    CASE 
      WHEN o.birth_date IS NULL THEN 'Non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 30 THEN 'Moins de 30 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 30 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 40 THEN '30-39 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 40 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 50 THEN '40-49 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 50 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 60 THEN '50-59 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 60 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 70 THEN '60-69 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 70 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 80 THEN '70-79 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 80 THEN '80 ans et plus'
    END as age_category,
    DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) as age_numeric
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  WHERE o.kind_class = 'Personne physique' OR o.kind_class IS NULL  -- Focus on individuals
),
age_summary AS (
  SELECT 
    age_category,
    COUNT(CASE WHEN has_housing_out THEN 1 END) as owners_with_housing_out,
    COUNT(*) as total_owners,
    ROUND(
      COUNT(CASE WHEN has_housing_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as pct_owners_with_housing_out,
    ROUND(AVG(CASE WHEN has_housing_out THEN age_numeric END), 1) as avg_age_with_housing_out,
    ROUND(AVG(age_numeric), 1) as avg_age_total
  FROM owner_age_analysis
  GROUP BY age_category
  HAVING COUNT(*) >= 50
)
SELECT 
  age_category,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  avg_age_with_housing_out,
  avg_age_total
FROM age_summary
ORDER BY 
  CASE age_category
    WHEN 'Non renseigné' THEN 0
    WHEN 'Moins de 30 ans' THEN 1
    WHEN '30-39 ans' THEN 2
    WHEN '40-49 ans' THEN 3
    WHEN '50-59 ans' THEN 4
    WHEN '60-69 ans' THEN 5
    WHEN '70-79 ans' THEN 6
    WHEN '80 ans et plus' THEN 7
  END;

-- 4. Administrator Status Analysis
-- Chart: Bar chart showing administrator vs non-administrator owners
SELECT 
  CASE 
    WHEN o.administrator = TRUE THEN 'Administrateur'
    WHEN o.administrator = FALSE THEN 'Non administrateur'
    ELSE 'Non renseigné'
  END as administrator_status,
  COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
  COUNT(DISTINCT o.owner_id) as total_owners,
  ROUND(
    COUNT(DISTINCT oho.owner_id) * 100.0 / 
    NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
  ) as pct_owners_with_housing_out,
  COUNT(oho.housing_id) as total_housing_out
FROM dwh.main_marts.marts_production_owners o
LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
GROUP BY 
  CASE 
    WHEN o.administrator = TRUE THEN 'Administrateur'
    WHEN o.administrator = FALSE THEN 'Non administrateur'
    ELSE 'Non renseigné'
  END
ORDER BY pct_owners_with_housing_out DESC;

-- 5. Entity Type Analysis (for legal entities)
-- Chart: Bar chart showing different entity types
WITH entity_analysis AS (
  SELECT 
    COALESCE(o.entity, 'Non renseigné') as entity_type,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(DISTINCT o.owner_id) as total_owners,
    ROUND(
      COUNT(DISTINCT oho.owner_id) * 100.0 / 
      NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
    ) as pct_owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  WHERE o.kind_class != 'Personne physique' OR o.kind_class IS NULL
  GROUP BY COALESCE(o.entity, 'Non renseigné')
  HAVING COUNT(DISTINCT o.owner_id) >= 5
)
SELECT 
  entity_type,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  total_housing_out
FROM entity_analysis
ORDER BY pct_owners_with_housing_out DESC;

-- 6. Data Source Analysis
-- Chart: Bar chart showing different data sources and their effectiveness
SELECT 
  COALESCE(o.data_source, 'Non renseigné') as data_source,
  COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
  COUNT(DISTINCT o.owner_id) as total_owners,
  ROUND(
    COUNT(DISTINCT oho.owner_id) * 100.0 / 
    NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
  ) as pct_owners_with_housing_out,
  COUNT(oho.housing_id) as total_housing_out
FROM dwh.main_marts.marts_production_owners o
LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
GROUP BY COALESCE(o.data_source, 'Non renseigné')
ORDER BY pct_owners_with_housing_out DESC;

-- 7. Owner Creation Timeline Analysis
-- Chart: Timeline showing when owners were created and their housing exit rates
WITH creation_timeline AS (
  SELECT 
    CASE 
      WHEN o.created_at IS NULL THEN 'Non renseigné'
      WHEN o.created_at >= '2024-01-01' THEN '2024'
      WHEN o.created_at >= '2023-01-01' AND o.created_at < '2024-01-01' THEN '2023'
      WHEN o.created_at >= '2022-01-01' AND o.created_at < '2023-01-01' THEN '2022'
      WHEN o.created_at >= '2021-01-01' AND o.created_at < '2022-01-01' THEN '2021'
      WHEN o.created_at < '2021-01-01' THEN 'Avant 2021'
    END as creation_period,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(DISTINCT o.owner_id) as total_owners,
    ROUND(
      COUNT(DISTINCT oho.owner_id) * 100.0 / 
      NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
    ) as pct_owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  GROUP BY 
    CASE 
      WHEN o.created_at IS NULL THEN 'Non renseigné'
      WHEN o.created_at >= '2024-01-01' THEN '2024'
      WHEN o.created_at >= '2023-01-01' AND o.created_at < '2024-01-01' THEN '2023'
      WHEN o.created_at >= '2022-01-01' AND o.created_at < '2023-01-01' THEN '2022'
      WHEN o.created_at >= '2021-01-01' AND o.created_at < '2022-01-01' THEN '2021'
      WHEN o.created_at < '2021-01-01' THEN 'Avant 2021'
    END
  HAVING COUNT(DISTINCT o.owner_id) >= 100
)
SELECT 
  creation_period,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  total_housing_out
FROM creation_timeline
ORDER BY 
  CASE creation_period
    WHEN 'Non renseigné' THEN 0
    WHEN 'Avant 2021' THEN 1
    WHEN '2021' THEN 2
    WHEN '2022' THEN 3
    WHEN '2023' THEN 4
    WHEN '2024' THEN 5
  END;

-- 8. Combined Owner Profile Analysis
-- Chart: Heatmap showing combinations of owner characteristics
WITH owner_profiles AS (
  SELECT 
    o.owner_id,
    oho.owner_id IS NOT NULL as has_housing_out,
    COALESCE(o.kind_class, 'Non renseigné') as owner_type,
    CASE 
      WHEN o.birth_date IS NULL THEN 'Age non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 50 THEN 'Moins de 50 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 50 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 70 THEN '50-69 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 70 THEN '70 ans et plus'
    END as age_group,
    CASE 
      WHEN o.administrator = TRUE THEN 'Administrateur'
      ELSE 'Non administrateur'
    END as admin_status
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
),
profile_combinations AS (
  SELECT 
    owner_type,
    age_group,
    admin_status,
    COUNT(CASE WHEN has_housing_out THEN 1 END) as owners_with_housing_out,
    COUNT(*) as total_owners,
    ROUND(
      COUNT(CASE WHEN has_housing_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as pct_owners_with_housing_out
  FROM owner_profiles
  GROUP BY owner_type, age_group, admin_status
  HAVING COUNT(*) >= 20
)
SELECT 
  owner_type,
  age_group,
  admin_status,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out
FROM profile_combinations
ORDER BY pct_owners_with_housing_out DESC;

