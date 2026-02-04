{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Owner profile linked to housing (rank=1 only)
-- Contains owner characteristics for vacancy exit analysis

WITH housing_out AS (
    SELECT 
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

housing_owners AS (
    SELECT * FROM {{ ref('int_analysis_housing_owners') }}
)

SELECT
    -- =====================================================
    -- IDENTIFIERS
    -- =====================================================
    CAST(ho.housing_id AS VARCHAR) AS housing_id,
    hown.owner_id,
    
    -- =====================================================
    -- OWNER TYPE
    -- =====================================================
    hown.owner_kind_class,
    CASE 
        WHEN hown.owner_is_individual THEN 'Particulier'
        WHEN hown.owner_is_sci THEN 'SCI'
        WHEN hown.owner_is_indivision THEN 'Indivision'
        WHEN hown.owner_is_company THEN 'Autre personne morale'
        WHEN hown.owner_kind_class IS NULL THEN 'Inconnu'
        ELSE 'Autre'
    END AS owner_kind_category,
    hown.owner_is_individual,
    hown.owner_is_sci,
    hown.owner_is_company,
    hown.owner_is_indivision,
    
    -- =====================================================
    -- OWNER DEMOGRAPHICS
    -- =====================================================
    hown.owner_birth_date,
    hown.owner_age,
    hown.owner_age_category,
    hown.owner_generation,
    
    -- =====================================================
    -- OWNER LOCATION
    -- =====================================================
    hown.owner_postal_code,
    hown.owner_city,
    hown.owner_department_code,
    hown.owner_location_relative_label,
    hown.owner_is_local,
    hown.owner_is_distant,
    
    -- =====================================================
    -- DISTANCE
    -- =====================================================
    hown.owner_distance_km,
    hown.owner_distance_category,
    
    -- =====================================================
    -- PROPERTY RIGHTS
    -- =====================================================
    hown.property_right,
    hown.property_right_category,
    hown.owner_is_full_owner,
    
    -- =====================================================
    -- MULTI-OWNERSHIP
    -- =====================================================
    hown.owner_housing_count,
    hown.owner_is_multi_owner,
    hown.owner_portfolio_category,
    
    -- =====================================================
    -- OWNER CONTACT INFO
    -- =====================================================
    hown.owner_has_email,
    hown.owner_has_phone,
    hown.owner_contactable

FROM housing_out ho
LEFT JOIN housing_owners hown ON ho.housing_id = hown.housing_id
