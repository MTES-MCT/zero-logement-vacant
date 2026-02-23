{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Housing characteristics for vacancy exit analysis
-- Contains intrinsic housing features with categorized variables for BI

WITH housing_out AS (
    SELECT * FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

production_housing AS (
    SELECT
        h.id AS housing_id,
        h.geo_code,
        h.housing_kind,
        h.rooms_count,
        h.living_area,
        h.building_year,
        h.vacancy_start_year,
        h.mutation_date,
        h.energy_consumption_bdnb,
        h.cadastral_classification,
        h.uncomfortable,
        h.taxed,
        h.beneficiary_count,
        h.rental_value,
        h.building_location,
        h.condominium,
        h.data_source,
        h.data_years,
        h.last_mutation_date,
        h.last_mutation_type,
        h.last_transaction_date,
        h.last_transaction_value
    FROM {{ ref('int_production_housing') }} h
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    CAST(ho.housing_id AS VARCHAR) AS housing_id,
    ph.geo_code,
    
    -- =====================================================
    -- TARGET VARIABLE
    -- =====================================================
    ho.is_housing_out,
    ho.vacancy_status_label,
    
    -- =====================================================
    -- HOUSING TYPE
    -- =====================================================
    ph.housing_kind,
    CASE 
        WHEN ph.housing_kind = 'maison' THEN 'Maison'
        WHEN ph.housing_kind = 'appartement' THEN 'Appartement'
        ELSE 'Autre'
    END AS housing_kind_label,
    
    -- =====================================================
    -- SIZE FEATURES
    -- =====================================================
    ph.rooms_count,
    CASE 
        WHEN ph.rooms_count IS NULL THEN 'Inconnu'
        WHEN ph.rooms_count = 1 THEN '1 piece'
        WHEN ph.rooms_count = 2 THEN '2 pieces'
        WHEN ph.rooms_count = 3 THEN '3 pieces'
        WHEN ph.rooms_count = 4 THEN '4 pieces'
        ELSE '5 pieces et plus'
    END AS rooms_count_category,
    
    ph.living_area,
    CASE 
        WHEN ph.living_area IS NULL THEN 'Inconnu'
        WHEN ph.living_area < 30 THEN 'Moins de 30m2'
        WHEN ph.living_area < 50 THEN '30-49m2'
        WHEN ph.living_area < 80 THEN '50-79m2'
        WHEN ph.living_area < 100 THEN '80-99m2'
        WHEN ph.living_area < 150 THEN '100-149m2'
        ELSE '150m2 et plus'
    END AS living_area_category,
    CASE 
        WHEN ph.living_area IS NULL THEN 'Inconnu'
        WHEN ph.living_area < 50 THEN 'Petit (<50m2)'
        WHEN ph.living_area < 100 THEN 'Moyen (50-100m2)'
        ELSE 'Grand (>100m2)'
    END AS surface_category,
    
    -- =====================================================
    -- BUILDING FEATURES
    -- =====================================================
    ph.building_year,
    CASE 
        WHEN ph.building_year IS NULL OR ph.building_year = 0 THEN 'Inconnu'
        WHEN ph.building_year < 1900 THEN 'Avant 1900'
        WHEN ph.building_year < 1950 THEN '1900-1949'
        WHEN ph.building_year < 1970 THEN '1950-1969'
        WHEN ph.building_year < 1990 THEN '1970-1989'
        WHEN ph.building_year < 2000 THEN '1990-1999'
        WHEN ph.building_year < 2010 THEN '2000-2009'
        ELSE '2010 et apres'
    END AS building_year_category,
    CASE 
        WHEN ph.building_year IS NULL OR ph.building_year = 0 THEN NULL
        ELSE 2025 - ph.building_year
    END AS building_age,
    CASE 
        WHEN ph.building_year IS NULL OR ph.building_year = 0 THEN 'Inconnu'
        WHEN 2025 - ph.building_year < 20 THEN 'Recent (<20 ans)'
        WHEN 2025 - ph.building_year < 50 THEN 'Moderne (20-50 ans)'
        WHEN 2025 - ph.building_year < 100 THEN 'Ancien (50-100 ans)'
        ELSE 'Tres ancien (>100 ans)'
    END AS building_age_category,
    ph.building_location,
    ph.condominium,
    
    -- =====================================================
    -- ENERGY PERFORMANCE
    -- =====================================================
    ph.energy_consumption_bdnb,
    CASE 
        WHEN ph.energy_consumption_bdnb IS NULL THEN 'Inconnu'
        WHEN ph.energy_consumption_bdnb IN ('A', 'B') THEN 'Performant (A-B)'
        WHEN ph.energy_consumption_bdnb IN ('C', 'D') THEN 'Moyen (C-D)'
        WHEN ph.energy_consumption_bdnb = 'E' THEN 'Peu performant (E)'
        WHEN ph.energy_consumption_bdnb IN ('F', 'G') THEN 'Passoire (F-G)'
        ELSE 'Inconnu'
    END AS energy_consumption_category,
    CASE 
        WHEN ph.energy_consumption_bdnb IN ('F', 'G') THEN TRUE 
        WHEN ph.energy_consumption_bdnb IS NULL THEN NULL
        ELSE FALSE 
    END AS is_energy_sieve,
    
    -- =====================================================
    -- CADASTRAL & COMFORT
    -- =====================================================
    ph.cadastral_classification,
    CASE 
        WHEN ph.cadastral_classification IS NULL THEN 'Inconnu'
        WHEN ph.cadastral_classification = 1 THEN 'Grand luxe'
        WHEN ph.cadastral_classification = 2 THEN 'Luxe'
        WHEN ph.cadastral_classification = 3 THEN 'Tres confortable'
        WHEN ph.cadastral_classification = 4 THEN 'Confortable'
        WHEN ph.cadastral_classification = 5 THEN 'Assez confortable'
        WHEN ph.cadastral_classification = 6 THEN 'Ordinaire'
        WHEN ph.cadastral_classification = 7 THEN 'Mediocre'
        WHEN ph.cadastral_classification = 8 THEN 'Tres mediocre'
        ELSE 'Inconnu'
    END AS cadastral_classification_label,
    ph.uncomfortable,
    COALESCE(ph.uncomfortable, FALSE) AS is_uncomfortable,
    
    -- =====================================================
    -- FINANCIAL
    -- =====================================================
    ph.taxed,
    COALESCE(ph.taxed, FALSE) AS is_taxed,
    ph.beneficiary_count,
    ph.rental_value,
    CASE 
        WHEN ph.rental_value IS NULL THEN 'Inconnu'
        WHEN ph.rental_value < 500 THEN 'Tres faible (<500€)'
        WHEN ph.rental_value < 1000 THEN 'Faible (500-1000€)'
        WHEN ph.rental_value < 2000 THEN 'Moyen (1000-2000€)'
        WHEN ph.rental_value < 3500 THEN 'Eleve (2000-3500€)'
        ELSE 'Tres eleve (>3500€)'
    END AS rental_value_category,
    
    -- =====================================================
    -- VACANCY DURATION
    -- =====================================================
    ho.vacancy_start_year,
    ho.years_in_vacancy,
    ho.vacancy_duration_category,
    -- Vacancy severity: combines duration + energy + cadastral
    CASE 
        WHEN ho.years_in_vacancy IS NULL THEN 'Indetermine'
        WHEN ho.years_in_vacancy > 10 
             AND ph.energy_consumption_bdnb IN ('F', 'G') 
             AND ph.cadastral_classification >= 7 THEN 'Tres severe'
        WHEN ho.years_in_vacancy > 5 
             AND (ph.energy_consumption_bdnb IN ('F', 'G') 
                  OR ph.cadastral_classification >= 6) THEN 'Severe'
        WHEN ho.years_in_vacancy > 2 THEN 'Moderee'
        ELSE 'Legere'
    END AS vacancy_severity,
    
    -- =====================================================
    -- MUTATION INFO
    -- =====================================================
    ph.mutation_date,
    ph.last_mutation_date,
    ph.last_mutation_type,
    ph.last_transaction_date,
    ph.last_transaction_value,
    CASE 
        WHEN ph.mutation_date IS NOT NULL 
             AND ph.mutation_date >= CURRENT_DATE - INTERVAL '5 years'
        THEN TRUE 
        ELSE FALSE 
    END AS has_recent_mutation,
    
    -- =====================================================
    -- DATA QUALITY
    -- =====================================================
    ph.data_source,
    CASE 
        WHEN ph.data_years IS NOT NULL 
        THEN array_length(ph.data_years)
        ELSE 0
    END AS data_years_count

FROM housing_out ho
LEFT JOIN production_housing ph ON CAST(ho.housing_id AS UUID) = ph.housing_id
