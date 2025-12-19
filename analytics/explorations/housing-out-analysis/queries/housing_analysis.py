"""
Housing Analysis Queries
Provides SQL queries for housing-level analysis (descriptive, characteristics).
"""

# ============================================================
# TYPE DE LOGEMENT
# ============================================================

EXIT_RATE_BY_HOUSING_TYPE = """
SELECT 
    housing_kind,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE housing_kind IS NOT NULL
GROUP BY housing_kind
ORDER BY exit_rate_pct DESC
"""

# ============================================================
# SURFACE ET NOMBRE DE PIECES
# ============================================================

EXIT_RATE_BY_SURFACE_CATEGORY = """
SELECT 
    surface_category,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE surface_category != 'Inconnu'
GROUP BY surface_category
ORDER BY 
    CASE surface_category
        WHEN 'Moins de 30m²' THEN 1
        WHEN '30-49m²' THEN 2
        WHEN '50-79m²' THEN 3
        WHEN '80-99m²' THEN 4
        WHEN '100-149m²' THEN 5
        WHEN '150m² et plus' THEN 6
    END
"""

EXIT_RATE_BY_ROOMS_COUNT = """
SELECT 
    CASE 
        WHEN rooms_count >= 6 THEN '6+ pièces'
        ELSE rooms_count || ' pièce(s)'
    END as rooms_category,
    rooms_count as rooms_num,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE rooms_count IS NOT NULL AND rooms_count > 0
GROUP BY rooms_count
ORDER BY rooms_count
"""

LIVING_AREA_DISTRIBUTION = """
SELECT 
    is_housing_out,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY living_area) as q1,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY living_area) as median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY living_area) as q3,
    AVG(living_area) as mean,
    MIN(living_area) as min_val,
    MAX(living_area) as max_val
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE living_area IS NOT NULL AND living_area > 0 AND living_area < 1000
GROUP BY is_housing_out
"""

# ============================================================
# AGE DU BATIMENT
# ============================================================

EXIT_RATE_BY_BUILDING_AGE = """
SELECT 
    building_age_category,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct,
    ROUND(AVG(building_year), 0) as avg_building_year
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE building_age_category != 'Inconnu'
GROUP BY building_age_category
ORDER BY 
    CASE building_age_category
        WHEN 'Avant 1900' THEN 1
        WHEN '1900-1949' THEN 2
        WHEN '1950-1969' THEN 3
        WHEN '1970-1989' THEN 4
        WHEN '1990-1999' THEN 5
        WHEN '2000-2009' THEN 6
        WHEN '2010 et après' THEN 7
    END
"""

# ============================================================
# PERFORMANCE ENERGETIQUE (DPE)
# ============================================================

EXIT_RATE_BY_DPE = """
SELECT 
    COALESCE(energy_consumption_bdnb, 'Non renseigné') as dpe_class,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
GROUP BY energy_consumption_bdnb
ORDER BY 
    CASE energy_consumption_bdnb
        WHEN 'A' THEN 1
        WHEN 'B' THEN 2
        WHEN 'C' THEN 3
        WHEN 'D' THEN 4
        WHEN 'E' THEN 5
        WHEN 'F' THEN 6
        WHEN 'G' THEN 7
        ELSE 8
    END
"""

EXIT_RATE_ENERGY_SIEVE = """
SELECT 
    is_energy_sieve,
    CASE WHEN is_energy_sieve THEN 'Passoire énergétique (F-G)' ELSE 'Non passoire (A-E)' END as label,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE energy_consumption_bdnb IS NOT NULL
GROUP BY is_energy_sieve
ORDER BY is_energy_sieve
"""

# ============================================================
# DUREE DE VACANCE
# ============================================================

EXIT_RATE_BY_VACANCY_DURATION = """
SELECT 
    vacancy_duration_category,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct,
    ROUND(AVG(years_in_vacancy), 1) as avg_years_in_vacancy
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE vacancy_duration_category != 'Inconnu'
GROUP BY vacancy_duration_category
ORDER BY 
    CASE vacancy_duration_category
        WHEN '0-2 ans' THEN 1
        WHEN '3-5 ans' THEN 2
        WHEN '6-10 ans' THEN 3
        WHEN 'Plus de 10 ans' THEN 4
    END
"""

YEARS_IN_VACANCY_DISTRIBUTION = """
SELECT 
    is_housing_out,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY years_in_vacancy) as q1,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY years_in_vacancy) as median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY years_in_vacancy) as q3,
    AVG(years_in_vacancy) as mean,
    MIN(years_in_vacancy) as min_val,
    MAX(years_in_vacancy) as max_val
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE years_in_vacancy IS NOT NULL AND years_in_vacancy >= 0
GROUP BY is_housing_out
"""

# ============================================================
# CAMPAGNES ET CONTACT ZLV
# ============================================================

EXIT_RATE_BY_CONTACT_STATUS = """
SELECT 
    has_been_contacted,
    CASE WHEN has_been_contacted THEN 'Contacté' ELSE 'Non contacté' END as contact_label,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
GROUP BY has_been_contacted
ORDER BY has_been_contacted DESC
"""

EXIT_RATE_BY_CAMPAIGNS_COUNT = """
SELECT 
    CASE 
        WHEN campaigns_count = 0 THEN '0 campagne'
        WHEN campaigns_count = 1 THEN '1 campagne'
        WHEN campaigns_count = 2 THEN '2 campagnes'
        WHEN campaigns_count >= 3 THEN '3+ campagnes'
    END as campaigns_category,
    campaigns_count as campaigns_num,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE campaigns_count IS NOT NULL
GROUP BY campaigns_count
ORDER BY campaigns_count
"""

# ============================================================
# TERRITOIRES SPECIAUX
# ============================================================

EXIT_RATE_BY_TLV = """
SELECT 
    CASE 
        WHEN is_in_tlv1_territory THEN 'TLV1'
        WHEN is_in_tlv2_territory THEN 'TLV2'
        ELSE 'Hors TLV'
    END as tlv_status,
    COUNT(*) as total_count,
    SUM(is_housing_out) as housing_out_count,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as exit_rate_pct
FROM dwh.main_marts.marts_analysis_housing_out_features
GROUP BY 
    CASE 
        WHEN is_in_tlv1_territory THEN 'TLV1'
        WHEN is_in_tlv2_territory THEN 'TLV2'
        ELSE 'Hors TLV'
    END
ORDER BY 
    CASE 
        WHEN is_in_tlv1_territory THEN 1
        WHEN is_in_tlv2_territory THEN 2
        ELSE 3
    END
"""

EXIT_RATE_BY_SPECIAL_TERRITORIES = """
SELECT 
    'Action Cœur de Ville' as territory_type,
    SUM(CASE WHEN action_coeur_de_ville THEN 1 ELSE 0 END) as in_territory_count,
    SUM(CASE WHEN action_coeur_de_ville AND is_housing_out = 1 THEN 1 ELSE 0 END) as housing_out_in_territory,
    ROUND(SUM(CASE WHEN action_coeur_de_ville AND is_housing_out = 1 THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CASE WHEN action_coeur_de_ville THEN 1 ELSE 0 END), 0), 2) as exit_rate_in_territory
FROM dwh.main_marts.marts_analysis_housing_out_features

UNION ALL

SELECT 
    'Petites Villes de Demain' as territory_type,
    SUM(CASE WHEN petite_ville_de_demain THEN 1 ELSE 0 END) as in_territory_count,
    SUM(CASE WHEN petite_ville_de_demain AND is_housing_out = 1 THEN 1 ELSE 0 END) as housing_out_in_territory,
    ROUND(SUM(CASE WHEN petite_ville_de_demain AND is_housing_out = 1 THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CASE WHEN petite_ville_de_demain THEN 1 ELSE 0 END), 0), 2) as exit_rate_in_territory
FROM dwh.main_marts.marts_analysis_housing_out_features

UNION ALL

SELECT 
    'Village d''Avenir' as territory_type,
    SUM(CASE WHEN village_davenir THEN 1 ELSE 0 END) as in_territory_count,
    SUM(CASE WHEN village_davenir AND is_housing_out = 1 THEN 1 ELSE 0 END) as housing_out_in_territory,
    ROUND(SUM(CASE WHEN village_davenir AND is_housing_out = 1 THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CASE WHEN village_davenir THEN 1 ELSE 0 END), 0), 2) as exit_rate_in_territory
FROM dwh.main_marts.marts_analysis_housing_out_features

UNION ALL

SELECT 
    'OPAH' as territory_type,
    SUM(CASE WHEN opah THEN 1 ELSE 0 END) as in_territory_count,
    SUM(CASE WHEN opah AND is_housing_out = 1 THEN 1 ELSE 0 END) as housing_out_in_territory,
    ROUND(SUM(CASE WHEN opah AND is_housing_out = 1 THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CASE WHEN opah THEN 1 ELSE 0 END), 0), 2) as exit_rate_in_territory
FROM dwh.main_marts.marts_analysis_housing_out_features

UNION ALL

SELECT 
    'ORT Signé' as territory_type,
    SUM(CASE WHEN ort_signed THEN 1 ELSE 0 END) as in_territory_count,
    SUM(CASE WHEN ort_signed AND is_housing_out = 1 THEN 1 ELSE 0 END) as housing_out_in_territory,
    ROUND(SUM(CASE WHEN ort_signed AND is_housing_out = 1 THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CASE WHEN ort_signed THEN 1 ELSE 0 END), 0), 2) as exit_rate_in_territory
FROM dwh.main_marts.marts_analysis_housing_out_features
"""

# ============================================================
# SAMPLE DATA FOR ML
# ============================================================

HOUSING_SAMPLE_FOR_ML = """
SELECT 
    housing_id,
    is_housing_out,
    -- Housing characteristics
    housing_kind,
    rooms_count,
    living_area,
    building_year,
    years_in_vacancy,
    is_energy_sieve,
    -- ZLV activity
    has_been_contacted,
    campaigns_count,
    -- City characteristics
    densite_grid,
    population_2022,
    is_population_declining,
    loyer_predit_m2,
    -- Market
    dvg_marche_dynamisme
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE housing_kind IS NOT NULL
  AND rooms_count IS NOT NULL
  AND living_area IS NOT NULL
  AND living_area > 0
  AND living_area < 500
USING SAMPLE 10 PERCENT
"""











