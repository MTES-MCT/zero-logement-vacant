-- =====================================================
-- OWNER PROPERTY PORTFOLIO ANALYSIS
-- Property Ownership Experience and Portfolio Characteristics
-- =====================================================

-- 1. Portfolio Size Analysis
-- Chart: Histogram showing distribution of housing count per owner
WITH owner_portfolio_size AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_out_count,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    ROUND(AVG(oho.total_groups), 1) as avg_groups_per_housing,
    MAX(oho.total_sent) as max_campaigns_received,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    STRING_AGG(DISTINCT oho.housing_kind, ', ') as housing_types_owned
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
),
portfolio_categories AS (
  SELECT 
    CASE 
      WHEN housing_out_count = 1 THEN '1 logement'
      WHEN housing_out_count = 2 THEN '2 logements'
      WHEN housing_out_count = 3 THEN '3 logements'
      WHEN housing_out_count >= 4 AND housing_out_count <= 5 THEN '4-5 logements'
      WHEN housing_out_count >= 6 AND housing_out_count <= 10 THEN '6-10 logements'
      WHEN housing_out_count > 10 THEN '10+ logements'
    END as portfolio_size_category,
    COUNT(owner_id) as owners_count,
    SUM(housing_out_count) as total_housing_out,
    ROUND(AVG(housing_out_count), 1) as avg_housing_per_owner,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(housing_with_campaigns * 100.0 / housing_out_count), 1) as avg_pct_housing_with_campaigns,
    ROUND(AVG(max_campaigns_received), 1) as avg_max_campaigns
  FROM owner_portfolio_size
  GROUP BY 
    CASE 
      WHEN housing_out_count = 1 THEN '1 logement'
      WHEN housing_out_count = 2 THEN '2 logements'
      WHEN housing_out_count = 3 THEN '3 logements'
      WHEN housing_out_count >= 4 AND housing_out_count <= 5 THEN '4-5 logements'
      WHEN housing_out_count >= 6 AND housing_out_count <= 10 THEN '6-10 logements'
      WHEN housing_out_count > 10 THEN '10+ logements'
    END
)
SELECT 
  portfolio_size_category,
  owners_count,
  total_housing_out,
  avg_housing_per_owner,
  avg_campaigns_per_housing,
  avg_pct_housing_with_campaigns,
  avg_max_campaigns
FROM portfolio_categories
ORDER BY 
  CASE portfolio_size_category
    WHEN '1 logement' THEN 1
    WHEN '2 logements' THEN 2
    WHEN '3 logements' THEN 3
    WHEN '4-5 logements' THEN 4
    WHEN '6-10 logements' THEN 5
    WHEN '10+ logements' THEN 6
  END;

-- 2. Housing Type Diversity Analysis
-- Chart: Stacked bar chart showing housing type combinations
WITH owner_housing_types AS (
  SELECT 
    oho.owner_id,
    COUNT(DISTINCT oho.housing_kind) as housing_types_count,
    STRING_AGG(DISTINCT oho.housing_kind, ', ' ORDER BY oho.housing_kind) as housing_types_list,
    COUNT(oho.housing_id) as total_housing_out,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.housing_kind IS NOT NULL
  GROUP BY oho.owner_id
),
type_diversity_analysis AS (
  SELECT 
    CASE 
      WHEN housing_types_count = 1 THEN '1 type de logement'
      WHEN housing_types_count = 2 THEN '2 types de logements'
      WHEN housing_types_count >= 3 THEN '3+ types de logements'
    END as type_diversity,
    housing_types_list,
    COUNT(owner_id) as owners_count,
    SUM(total_housing_out) as total_housing_out,
    ROUND(AVG(total_housing_out), 1) as avg_housing_per_owner,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent
  FROM owner_housing_types
  GROUP BY 
    CASE 
      WHEN housing_types_count = 1 THEN '1 type de logement'
      WHEN housing_types_count = 2 THEN '2 types de logements'
      WHEN housing_types_count >= 3 THEN '3+ types de logements'
    END,
    housing_types_list
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  type_diversity,
  housing_types_list,
  owners_count,
  total_housing_out,
  avg_housing_per_owner,
  avg_campaigns_sent
FROM type_diversity_analysis
ORDER BY owners_count DESC;

-- 3. Geographic Diversification Analysis
-- Chart: Scatter plot showing geographic spread vs campaign effectiveness
WITH owner_geographic_spread AS (
  SELECT 
    oho.owner_id,
    COUNT(DISTINCT oho.geo_code) as cities_count,
    COUNT(DISTINCT LEFT(oho.geo_code, 2)) as departments_count,
    COUNT(oho.housing_id) as total_housing_out,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
),
geographic_categories AS (
  SELECT 
    CASE 
      WHEN cities_count = 1 THEN '1 ville'
      WHEN cities_count = 2 THEN '2 villes'
      WHEN cities_count = 3 THEN '3 villes'
      WHEN cities_count >= 4 THEN '4+ villes'
    END as geographic_spread,
    CASE 
      WHEN departments_count = 1 THEN '1 département'
      WHEN departments_count = 2 THEN '2 départements'
      WHEN departments_count >= 3 THEN '3+ départements'
    END as departmental_spread,
    COUNT(owner_id) as owners_count,
    SUM(total_housing_out) as total_housing_out,
    ROUND(AVG(total_housing_out), 1) as avg_housing_per_owner,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent,
    ROUND(AVG(pct_housing_with_campaigns), 1) as avg_pct_housing_with_campaigns
  FROM owner_geographic_spread
  GROUP BY 
    CASE 
      WHEN cities_count = 1 THEN '1 ville'
      WHEN cities_count = 2 THEN '2 villes'
      WHEN cities_count = 3 THEN '3 villes'
      WHEN cities_count >= 4 THEN '4+ villes'
    END,
    CASE 
      WHEN departments_count = 1 THEN '1 département'
      WHEN departments_count = 2 THEN '2 départements'
      WHEN departments_count >= 3 THEN '3+ départements'
    END
)
SELECT 
  geographic_spread,
  departmental_spread,
  owners_count,
  total_housing_out,
  avg_housing_per_owner,
  avg_campaigns_sent,
  avg_pct_housing_with_campaigns
FROM geographic_categories
ORDER BY owners_count DESC;

-- 4. Property Value Portfolio Analysis
-- Chart: Box plot showing rental value distributions by portfolio size
WITH owner_value_analysis AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_count,
    ROUND(AVG(oho.rental_value), 0) as avg_rental_value,
    ROUND(SUM(oho.rental_value), 0) as total_rental_value,
    ROUND(MIN(oho.rental_value), 0) as min_rental_value,
    ROUND(MAX(oho.rental_value), 0) as max_rental_value,
    ROUND(AVG(oho.living_area), 1) as avg_living_area,
    ROUND(SUM(oho.living_area), 1) as total_living_area,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.rental_value IS NOT NULL AND oho.rental_value > 0
  GROUP BY oho.owner_id
),
value_portfolio_categories AS (
  SELECT 
    CASE 
      WHEN housing_count = 1 THEN 'Mono-propriétaire'
      WHEN housing_count >= 2 AND housing_count <= 3 THEN 'Petit portefeuille (2-3)'
      WHEN housing_count >= 4 AND housing_count <= 10 THEN 'Portefeuille moyen (4-10)'
      WHEN housing_count > 10 THEN 'Gros portefeuille (10+)'
    END as portfolio_category,
    CASE 
      WHEN total_rental_value < 1000 THEN 'Faible valeur (< 1k€)'
      WHEN total_rental_value >= 1000 AND total_rental_value < 3000 THEN 'Valeur modérée (1-3k€)'
      WHEN total_rental_value >= 3000 AND total_rental_value < 5000 THEN 'Valeur élevée (3-5k€)'
      WHEN total_rental_value >= 5000 THEN 'Très haute valeur (5k€+)'
    END as value_category,
    COUNT(owner_id) as owners_count,
    ROUND(AVG(housing_count), 1) as avg_housing_count,
    ROUND(AVG(avg_rental_value), 0) as avg_rental_value_per_housing,
    ROUND(AVG(total_rental_value), 0) as avg_total_rental_value,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent
  FROM owner_value_analysis
  GROUP BY 
    CASE 
      WHEN housing_count = 1 THEN 'Mono-propriétaire'
      WHEN housing_count >= 2 AND housing_count <= 3 THEN 'Petit portefeuille (2-3)'
      WHEN housing_count >= 4 AND housing_count <= 10 THEN 'Portefeuille moyen (4-10)'
      WHEN housing_count > 10 THEN 'Gros portefeuille (10+)'
    END,
    CASE 
      WHEN total_rental_value < 1000 THEN 'Faible valeur (< 1k€)'
      WHEN total_rental_value >= 1000 AND total_rental_value < 3000 THEN 'Valeur modérée (1-3k€)'
      WHEN total_rental_value >= 3000 AND total_rental_value < 5000 THEN 'Valeur élevée (3-5k€)'
      WHEN total_rental_value >= 5000 THEN 'Très haute valeur (5k€+)'
    END
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  portfolio_category,
  value_category,
  owners_count,
  avg_housing_count,
  avg_rental_value_per_housing,
  avg_total_rental_value,
  avg_campaigns_sent
FROM value_portfolio_categories
ORDER BY owners_count DESC;

-- 5. Building Age Diversity in Portfolio
-- Chart: Stacked bar chart showing building age diversity
WITH owner_building_ages AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_count,
    COUNT(DISTINCT 
      CASE 
        WHEN oho.building_year IS NULL THEN 'Non renseigné'
        WHEN oho.building_year < 1946 THEN 'Avant 1946'
        WHEN oho.building_year >= 1946 AND oho.building_year < 1971 THEN '1946-1970'
        WHEN oho.building_year >= 1971 AND oho.building_year < 1991 THEN '1971-1990'
        WHEN oho.building_year >= 1991 THEN '1991 et après'
      END
    ) as age_periods_count,
    ROUND(AVG(oho.building_year), 0) as avg_building_year,
    ROUND(AVG(2024 - oho.building_year), 0) as avg_building_age,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.building_year IS NOT NULL
  GROUP BY oho.owner_id
),
age_diversity_analysis AS (
  SELECT 
    CASE 
      WHEN age_periods_count = 1 THEN 'Même période de construction'
      WHEN age_periods_count = 2 THEN '2 périodes de construction'
      WHEN age_periods_count >= 3 THEN '3+ périodes de construction'
    END as age_diversity,
    CASE 
      WHEN avg_building_age < 30 THEN 'Patrimoine récent (< 30 ans)'
      WHEN avg_building_age >= 30 AND avg_building_age < 50 THEN 'Patrimoine moderne (30-50 ans)'
      WHEN avg_building_age >= 50 AND avg_building_age < 80 THEN 'Patrimoine ancien (50-80 ans)'
      WHEN avg_building_age >= 80 THEN 'Patrimoine très ancien (80+ ans)'
    END as age_category,
    COUNT(owner_id) as owners_count,
    ROUND(AVG(housing_count), 1) as avg_housing_count,
    ROUND(AVG(avg_building_age), 0) as avg_building_age_overall,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent
  FROM owner_building_ages
  GROUP BY 
    CASE 
      WHEN age_periods_count = 1 THEN 'Même période de construction'
      WHEN age_periods_count = 2 THEN '2 périodes de construction'
      WHEN age_periods_count >= 3 THEN '3+ périodes de construction'
    END,
    CASE 
      WHEN avg_building_age < 30 THEN 'Patrimoine récent (< 30 ans)'
      WHEN avg_building_age >= 30 AND avg_building_age < 50 THEN 'Patrimoine moderne (30-50 ans)'
      WHEN avg_building_age >= 50 AND avg_building_age < 80 THEN 'Patrimoine ancien (50-80 ans)'
      WHEN avg_building_age >= 80 THEN 'Patrimoine très ancien (80+ ans)'
    END
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  age_diversity,
  age_category,
  owners_count,
  avg_housing_count,
  avg_building_age_overall,
  avg_campaigns_sent
FROM age_diversity_analysis
ORDER BY owners_count DESC;

-- 6. Energy Performance Portfolio Analysis
-- Chart: Heatmap showing energy performance distribution
WITH owner_energy_performance AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_count,
    COUNT(CASE WHEN oho.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) as energy_sieve_count,
    COUNT(CASE WHEN oho.energy_consumption_bdnb IN ('A', 'B', 'C') THEN 1 END) as good_energy_count,
    ROUND(
      COUNT(CASE WHEN oho.energy_consumption_bdnb IN ('F', 'G') THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN oho.energy_consumption_bdnb IS NOT NULL THEN 1 END), 0), 1
    ) as pct_energy_sieve,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    STRING_AGG(DISTINCT oho.energy_consumption_bdnb, ', ' ORDER BY oho.energy_consumption_bdnb) as energy_classes_owned
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.energy_consumption_bdnb IS NOT NULL
  GROUP BY oho.owner_id
),
energy_portfolio_categories AS (
  SELECT 
    CASE 
      WHEN pct_energy_sieve = 0 THEN 'Aucune passoire énergétique'
      WHEN pct_energy_sieve > 0 AND pct_energy_sieve <= 25 THEN 'Peu de passoires (≤25%)'
      WHEN pct_energy_sieve > 25 AND pct_energy_sieve <= 50 THEN 'Passoires modérées (25-50%)'
      WHEN pct_energy_sieve > 50 AND pct_energy_sieve < 100 THEN 'Beaucoup de passoires (50-99%)'
      WHEN pct_energy_sieve = 100 THEN 'Que des passoires énergétiques'
    END as energy_portfolio_category,
    COUNT(owner_id) as owners_count,
    ROUND(AVG(housing_count), 1) as avg_housing_count,
    ROUND(AVG(energy_sieve_count), 1) as avg_energy_sieve_count,
    ROUND(AVG(good_energy_count), 1) as avg_good_energy_count,
    ROUND(AVG(pct_energy_sieve), 1) as avg_pct_energy_sieve,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent
  FROM owner_energy_performance
  GROUP BY 
    CASE 
      WHEN pct_energy_sieve = 0 THEN 'Aucune passoire énergétique'
      WHEN pct_energy_sieve > 0 AND pct_energy_sieve <= 25 THEN 'Peu de passoires (≤25%)'
      WHEN pct_energy_sieve > 25 AND pct_energy_sieve <= 50 THEN 'Passoires modérées (25-50%)'
      WHEN pct_energy_sieve > 50 AND pct_energy_sieve < 100 THEN 'Beaucoup de passoires (50-99%)'
      WHEN pct_energy_sieve = 100 THEN 'Que des passoires énergétiques'
    END
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  energy_portfolio_category,
  owners_count,
  avg_housing_count,
  avg_energy_sieve_count,
  avg_good_energy_count,
  avg_pct_energy_sieve,
  avg_campaigns_sent
FROM energy_portfolio_categories
ORDER BY avg_pct_energy_sieve;

-- 7. Vacancy Duration Portfolio Analysis
-- Chart: Stacked bar chart showing vacancy duration patterns
WITH owner_vacancy_patterns AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_count,
    ROUND(AVG(2024 - oho.vacancy_start_year), 1) as avg_vacancy_duration,
    COUNT(CASE WHEN (2024 - oho.vacancy_start_year) > 5 THEN 1 END) as long_vacant_count,
    COUNT(CASE WHEN (2024 - oho.vacancy_start_year) <= 2 THEN 1 END) as recent_vacant_count,
    ROUND(
      COUNT(CASE WHEN (2024 - oho.vacancy_start_year) > 5 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(CASE WHEN oho.vacancy_start_year IS NOT NULL THEN 1 END), 0), 1
    ) as pct_long_vacant,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.vacancy_start_year IS NOT NULL
  GROUP BY oho.owner_id
),
vacancy_portfolio_categories AS (
  SELECT 
    CASE 
      WHEN avg_vacancy_duration <= 3 THEN 'Vacance récente (≤3 ans)'
      WHEN avg_vacancy_duration > 3 AND avg_vacancy_duration <= 7 THEN 'Vacance modérée (3-7 ans)'
      WHEN avg_vacancy_duration > 7 THEN 'Vacance ancienne (>7 ans)'
    END as vacancy_duration_category,
    CASE 
      WHEN pct_long_vacant = 0 THEN 'Aucune vacance longue'
      WHEN pct_long_vacant > 0 AND pct_long_vacant <= 50 THEN 'Peu de vacance longue (≤50%)'
      WHEN pct_long_vacant > 50 THEN 'Beaucoup de vacance longue (>50%)'
    END as long_vacancy_category,
    COUNT(owner_id) as owners_count,
    ROUND(AVG(housing_count), 1) as avg_housing_count,
    ROUND(AVG(avg_vacancy_duration), 1) as avg_vacancy_duration_overall,
    ROUND(AVG(pct_long_vacant), 1) as avg_pct_long_vacant,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent
  FROM owner_vacancy_patterns
  GROUP BY 
    CASE 
      WHEN avg_vacancy_duration <= 3 THEN 'Vacance récente (≤3 ans)'
      WHEN avg_vacancy_duration > 3 AND avg_vacancy_duration <= 7 THEN 'Vacance modérée (3-7 ans)'
      WHEN avg_vacancy_duration > 7 THEN 'Vacance ancienne (>7 ans)'
    END,
    CASE 
      WHEN pct_long_vacant = 0 THEN 'Aucune vacance longue'
      WHEN pct_long_vacant > 0 AND pct_long_vacant <= 50 THEN 'Peu de vacance longue (≤50%)'
      WHEN pct_long_vacant > 50 THEN 'Beaucoup de vacance longue (>50%)'
    END
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  vacancy_duration_category,
  long_vacancy_category,
  owners_count,
  avg_housing_count,
  avg_vacancy_duration_overall,
  avg_pct_long_vacant,
  avg_campaigns_sent
FROM vacancy_portfolio_categories
ORDER BY owners_count DESC;

-- 8. Top Portfolio Owners Analysis
-- Chart: Table showing largest portfolio owners and their characteristics
WITH top_portfolio_owners AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as housing_count,
    COUNT(DISTINCT oho.geo_code) as cities_count,
    COUNT(DISTINCT LEFT(oho.geo_code, 2)) as departments_count,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    ROUND(SUM(oho.rental_value), 0) as total_rental_value,
    ROUND(AVG(oho.rental_value), 0) as avg_rental_value,
    STRING_AGG(DISTINCT oho.housing_kind, ', ') as housing_types,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
  HAVING COUNT(oho.housing_id) >= 5
)
SELECT 
  owner_id,
  housing_count,
  cities_count,
  departments_count,
  avg_campaigns_sent,
  total_rental_value,
  avg_rental_value,
  housing_types,
  housing_with_campaigns,
  pct_housing_with_campaigns,
  ROW_NUMBER() OVER (ORDER BY housing_count DESC) as portfolio_rank
FROM top_portfolio_owners
ORDER BY housing_count DESC
LIMIT 50;

