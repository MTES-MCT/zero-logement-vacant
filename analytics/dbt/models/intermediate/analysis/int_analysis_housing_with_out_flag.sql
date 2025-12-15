-- Intermediate model: Housing with is_housing_out flag
-- Creates a binary flag indicating if housing has exited vacancy
-- 
-- Logic:
-- - is_housing_out = 1: Housing was in LOVAC but is NOT in LOVAC 2025 (exited vacancy)
-- - is_housing_out = 0: Housing is still in LOVAC 2025 (still vacant)

WITH production_housing AS (
    SELECT
        h.id AS housing_id,
        h.geo_code,
        -- Extract LOVAC years present
        list_filter(h.data_file_years, x -> x LIKE 'lovac-%') AS lovac_years_present,
        
        -- Check if housing has any LOVAC history
        array_length(list_filter(h.data_file_years, x -> x LIKE 'lovac-%')) > 0 AS has_lovac_history,
        
        -- Check if housing is in LOVAC 2025 (still vacant)
        list_contains(h.data_file_years, 'lovac-2025') AS is_in_lovac_2025,
        
        -- Minimum LOVAC year (first year housing appeared in LOVAC)
        list_min(
            list_transform(
                list_filter(h.data_file_years, x -> x LIKE 'lovac-%'),
                x -> CAST(replace(x, 'lovac-', '') AS INTEGER)
            )
        ) AS vacancy_start_year
        
    FROM {{ ref('int_production_housing') }} h
),

with_out_flag AS (
    SELECT
        housing_id,
        geo_code,
        
        -- Minimum LOVAC year (first year housing appeared in LOVAC)
        vacancy_start_year,
        has_lovac_history,
        
        -- Housing Out Flag:
        -- 1 if housing was in LOVAC at some point but is NOT in LOVAC 2025
        -- 0 if housing is still in LOVAC 2025
        CASE 
            WHEN has_lovac_history AND NOT is_in_lovac_2025 THEN 1
            WHEN has_lovac_history AND is_in_lovac_2025 THEN 0
            ELSE NULL  -- No LOVAC history
        END AS is_housing_out,
        
        -- Additional derived metrics
        CASE 
            WHEN has_lovac_history AND NOT is_in_lovac_2025 THEN 'Sorti de vacance'
            WHEN has_lovac_history AND is_in_lovac_2025 THEN 'Toujours vacant'
            ELSE 'Pas dans LOVAC'
        END AS vacancy_status_label,
        
        -- Years in vacancy (if vacancy_start_year is available)
        CASE 
            WHEN vacancy_start_year IS NOT NULL AND vacancy_start_year > 0
            THEN 2025 - vacancy_start_year
            ELSE NULL
        END AS years_in_vacancy,
        
        -- Duration category
        CASE 
            WHEN vacancy_start_year IS NULL OR vacancy_start_year <= 0 THEN 'Inconnu'
            WHEN 2025 - vacancy_start_year <= 2 THEN '0-2 ans'
            WHEN 2025 - vacancy_start_year <= 5 THEN '3-5 ans'
            WHEN 2025 - vacancy_start_year <= 10 THEN '6-10 ans'
            ELSE 'Plus de 10 ans'
        END AS vacancy_duration_category
        
    FROM production_housing
)

SELECT * FROM with_out_flag
WHERE has_lovac_history = TRUE  -- Only keep housing with LOVAC history

