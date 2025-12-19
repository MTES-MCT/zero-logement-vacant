"""
City Analysis Queries
Provides SQL queries for city-level analysis (geographic, territorial).
"""

# ============================================================
# GEOGRAPHIC DISTRIBUTION
# ============================================================

EXIT_RATE_BY_DEPARTMENT = """
SELECT 
    department_code,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE department_code IS NOT NULL
GROUP BY department_code
ORDER BY exit_rate_pct DESC
"""

EXIT_RATE_BY_REGION = """
SELECT 
    region_code,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE region_code IS NOT NULL
GROUP BY region_code
ORDER BY exit_rate_pct DESC
"""

TOP_BOTTOM_DEPARTMENTS = """
WITH dept_stats AS (
    SELECT 
        department_code,
        SUM(total_housing_count) as total_housing,
        SUM(housing_out_count) as housing_out,
        ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct
    FROM dwh.main_marts.marts_analysis_city_aggregated
    WHERE department_code IS NOT NULL
    GROUP BY department_code
    HAVING SUM(total_housing_count) >= 1000  -- Minimum threshold
)
SELECT * FROM dept_stats
ORDER BY exit_rate_pct DESC
"""

# ============================================================
# DENSITY ANALYSIS
# ============================================================

EXIT_RATE_BY_DENSITY_CATEGORY = """
SELECT 
    densite_category,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct,
    ROUND(AVG(exit_rate_pct), 2) as avg_city_exit_rate
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_category IS NOT NULL
GROUP BY densite_category
ORDER BY 
    CASE densite_category
        WHEN 'Dense' THEN 1
        WHEN 'Intermédiaire' THEN 2
        WHEN 'Peu dense' THEN 3
        WHEN 'Très peu dense' THEN 4
    END
"""

EXIT_RATE_BY_DENSITY_GRID = """
SELECT 
    densite_grid,
    densite_label,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_grid IS NOT NULL
GROUP BY densite_grid, densite_label
ORDER BY densite_grid
"""

# ============================================================
# POPULATION DYNAMICS
# ============================================================

EXIT_RATE_BY_POPULATION_TREND = """
SELECT 
    is_population_declining,
    CASE WHEN is_population_declining THEN 'Population en déclin' ELSE 'Population stable/croissante' END as trend_label,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct,
    ROUND(AVG(population_growth_rate_2019_2022), 2) as avg_pop_growth_rate
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE is_population_declining IS NOT NULL
GROUP BY is_population_declining
ORDER BY is_population_declining
"""

EXIT_RATE_BY_POPULATION_SIZE = """
SELECT 
    CASE 
        WHEN population_2022 < 500 THEN 'Moins de 500 hab.'
        WHEN population_2022 < 2000 THEN '500-2000 hab.'
        WHEN population_2022 < 10000 THEN '2000-10000 hab.'
        WHEN population_2022 < 50000 THEN '10000-50000 hab.'
        WHEN population_2022 < 200000 THEN '50000-200000 hab.'
        ELSE 'Plus de 200000 hab.'
    END as population_category,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE population_2022 IS NOT NULL
GROUP BY 
    CASE 
        WHEN population_2022 < 500 THEN 'Moins de 500 hab.'
        WHEN population_2022 < 2000 THEN '500-2000 hab.'
        WHEN population_2022 < 10000 THEN '2000-10000 hab.'
        WHEN population_2022 < 50000 THEN '10000-50000 hab.'
        WHEN population_2022 < 200000 THEN '50000-200000 hab.'
        ELSE 'Plus de 200000 hab.'
    END
ORDER BY 
    CASE 
        WHEN population_2022 < 500 THEN 1
        WHEN population_2022 < 2000 THEN 2
        WHEN population_2022 < 10000 THEN 3
        WHEN population_2022 < 50000 THEN 4
        WHEN population_2022 < 200000 THEN 5
        ELSE 6
    END
"""

# ============================================================
# RENT AND REAL ESTATE MARKET
# ============================================================

EXIT_RATE_BY_RENT_LEVEL = """
SELECT 
    niveau_loyer,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct,
    ROUND(AVG(loyer_predit_m2), 2) as avg_rent_m2
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE niveau_loyer IS NOT NULL
GROUP BY niveau_loyer
ORDER BY 
    CASE niveau_loyer
        WHEN 'Très élevé' THEN 1
        WHEN 'Élevé' THEN 2
        WHEN 'Moyen' THEN 3
        WHEN 'Modéré' THEN 4
        WHEN 'Faible' THEN 5
    END
"""

EXIT_RATE_BY_MARKET_DYNAMISM = """
SELECT 
    dvg_marche_dynamisme,
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as housing_out,
    ROUND(SUM(housing_out_count) * 100.0 / NULLIF(SUM(total_housing_count), 0), 2) as exit_rate_pct,
    ROUND(AVG(dvg_avg_annual_transactions), 2) as avg_annual_transactions
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE dvg_marche_dynamisme IS NOT NULL
GROUP BY dvg_marche_dynamisme
ORDER BY 
    CASE dvg_marche_dynamisme
        WHEN 'Très dynamique' THEN 1
        WHEN 'Dynamique' THEN 2
        WHEN 'Modéré' THEN 3
        WHEN 'Faible' THEN 4
    END
"""

RENT_VS_EXIT_RATE_CORRELATION = """
SELECT 
    city_code,
    commune_name,
    exit_rate_pct,
    loyer_predit_m2,
    niveau_loyer,
    densite_category,
    total_housing_count
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE loyer_predit_m2 IS NOT NULL
  AND exit_rate_pct IS NOT NULL
  AND total_housing_count >= 50
ORDER BY total_housing_count DESC
LIMIT 500
"""

# ============================================================
# FISCAL PRESSURE
# ============================================================

EXIT_RATE_BY_FISCAL_PRESSURE = """
WITH fiscal_buckets AS (
    SELECT 
        city_code,
        exit_rate_pct,
        taux_tfb,
        total_housing_count,
        NTILE(5) OVER (ORDER BY taux_tfb) as fiscal_quintile
    FROM dwh.main_marts.marts_analysis_city_aggregated
    WHERE taux_tfb IS NOT NULL
      AND total_housing_count >= 10
)
SELECT 
    fiscal_quintile,
    COUNT(*) as city_count,
    ROUND(MIN(taux_tfb), 2) as min_tfb,
    ROUND(MAX(taux_tfb), 2) as max_tfb,
    ROUND(AVG(taux_tfb), 2) as avg_tfb,
    SUM(total_housing_count) as total_housing,
    ROUND(AVG(exit_rate_pct), 2) as avg_exit_rate
FROM fiscal_buckets
GROUP BY fiscal_quintile
ORDER BY fiscal_quintile
"""

# ============================================================
# CITY AGGREGATED SAMPLE
# ============================================================

CITY_AGGREGATED_SAMPLE = """
SELECT 
    city_code,
    commune_name,
    department_code,
    region_code,
    -- Vacancy stats
    total_housing_count,
    housing_out_count,
    exit_rate_pct,
    exit_rate_maisons_pct,
    exit_rate_appartements_pct,
    -- Demographics
    densite_category,
    population_2022,
    is_population_declining,
    -- Market
    loyer_predit_m2,
    niveau_loyer,
    dvg_marche_dynamisme,
    -- Fiscal
    taux_tfb
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE total_housing_count >= 50
ORDER BY total_housing_count DESC
LIMIT 1000
"""

# ============================================================
# CORRELATION ANALYSIS DATA
# ============================================================

CITY_FEATURES_FOR_CORRELATION = """
SELECT 
    exit_rate_pct,
    -- Demographics
    population_2022,
    population_growth_rate_2019_2022,
    densite_grid,
    -- Housing characteristics
    avg_living_area,
    avg_rooms_count,
    avg_years_in_vacancy,
    -- Market
    loyer_predit_m2,
    prix_median_m2_maisons_2023,
    prix_median_m2_appartements_2023,
    dvg_total_transactions_2019_2024,
    -- Fiscal
    taux_tfb
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE total_housing_count >= 30
  AND exit_rate_pct IS NOT NULL
  AND population_2022 IS NOT NULL
"""











