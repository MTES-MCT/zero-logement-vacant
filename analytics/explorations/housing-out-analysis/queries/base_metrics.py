"""
Base Metrics Queries
Provides SQL queries for global metrics and cohort overview.
"""

# ============================================================
# COHORT COUNTS
# ============================================================

HOUSING_OUT_COUNT = """
SELECT COUNT(*) as count
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE is_housing_out = 1
"""

STILL_VACANT_COUNT = """
SELECT COUNT(*) as count
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE is_housing_out = 0
"""

TOTAL_HOUSING_COUNT = """
SELECT COUNT(*) as count
FROM dwh.main_marts.marts_analysis_housing_out_features
"""

# ============================================================
# GLOBAL EXIT RATES
# ============================================================

GLOBAL_EXIT_RATE = """
SELECT 
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    SUM(CASE WHEN is_housing_out = 0 THEN 1 ELSE 0 END) as still_vacant_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
"""

# ============================================================
# CITY LEVEL OVERVIEW
# ============================================================

CITY_COUNT_WITH_DATA = """
SELECT 
    COUNT(DISTINCT city_code) as city_count,
    SUM(total_housing_count) as total_housing,
    SUM(housing_out_count) as total_housing_out,
    ROUND(AVG(exit_rate_pct), 2) as avg_exit_rate
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE total_housing_count > 0
"""

# ============================================================
# DATA QUALITY CHECKS
# ============================================================

DATA_QUALITY_OVERVIEW = """
SELECT
    COUNT(*) as total_rows,
    COUNT(DISTINCT housing_id) as unique_housing,
    COUNT(DISTINCT city_code) as unique_cities,
    SUM(CASE WHEN is_housing_out IS NULL THEN 1 ELSE 0 END) as null_target,
    SUM(CASE WHEN housing_kind IS NULL THEN 1 ELSE 0 END) as null_housing_kind,
    SUM(CASE WHEN living_area IS NULL THEN 1 ELSE 0 END) as null_living_area,
    SUM(CASE WHEN building_year IS NULL OR building_year = 0 THEN 1 ELSE 0 END) as null_building_year,
    SUM(CASE WHEN densite_category IS NULL THEN 1 ELSE 0 END) as null_densite
FROM dwh.main_marts.marts_analysis_housing_out_features
"""

# ============================================================
# TEMPORAL OVERVIEW
# ============================================================

VACANCY_START_YEAR_DISTRIBUTION = """
SELECT 
    vacancy_start_year,
    COUNT(*) as count,
    SUM(is_housing_out) as housing_out,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE vacancy_start_year IS NOT NULL AND vacancy_start_year > 2000
GROUP BY vacancy_start_year
ORDER BY vacancy_start_year
"""









