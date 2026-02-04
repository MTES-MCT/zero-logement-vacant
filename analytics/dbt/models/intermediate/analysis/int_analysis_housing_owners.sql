-- Intermediate model: Housing owners features at housing level
-- Filters to rank=1 (primary owner) only
-- Prepares owner characteristics for vacancy exit analysis

WITH housing_base AS (
    -- Get all housing with LOVAC history
    SELECT 
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

owners_housing AS (
    -- Get owner-housing relationships
    SELECT
        oh.housing_id,
        oh.owner_id,
        oh.rank,
        oh.housing_geo_code,
        oh.locprop_relative_ban,
        oh.locprop_distance_ban,
        oh.property_right
    FROM {{ ref('stg_production_owners_housing') }} oh
    WHERE oh.rank = 1  -- Primary owner only
),

owners AS (
    -- Get owner details
    SELECT
        o.id AS owner_id,
        o.kind_class,
        o.birth_date,
        o.email,
        o.phone,
        o.postal_code,
        o.city,
        o.siren
    FROM {{ ref('int_production_owners') }} o
),

-- Count housing per owner for multi-ownership detection
owner_housing_counts AS (
    SELECT
        owner_id,
        COUNT(DISTINCT housing_id) AS owner_housing_count
    FROM {{ ref('stg_production_owners_housing') }}
    GROUP BY owner_id
),

joined AS (
    SELECT
        h.housing_id,
        CAST(oh.owner_id AS VARCHAR) AS owner_id,
        
        -- Owner Type
        o.kind_class AS owner_kind_class,
        CASE 
            WHEN o.kind_class ILIKE '%particulier%' THEN TRUE
            ELSE FALSE
        END AS owner_is_individual,
        CASE 
            WHEN o.kind_class ILIKE '%SCI%' THEN TRUE
            ELSE FALSE
        END AS owner_is_sci,
        CASE 
            WHEN o.kind_class ILIKE '%personne morale%' 
                 OR o.kind_class ILIKE '%societe%'
                 OR o.kind_class ILIKE '%entreprise%'
                 OR o.siren IS NOT NULL
            THEN TRUE
            ELSE FALSE
        END AS owner_is_company,
        CASE 
            WHEN o.kind_class ILIKE '%indivision%' THEN TRUE
            ELSE FALSE
        END AS owner_is_indivision,
        
        -- Owner Demographics (individuals only)
        o.birth_date AS owner_birth_date,
        CASE 
            WHEN o.birth_date IS NOT NULL 
            THEN DATE_PART('year', AGE(CURRENT_DATE, CAST(o.birth_date AS DATE)))
            ELSE NULL
        END AS owner_age,
        CASE 
            WHEN o.kind_class NOT ILIKE '%particulier%' THEN 'Non applicable (PM)'
            WHEN o.birth_date IS NULL THEN 'Age inconnu'
            WHEN DATE_PART('year', AGE(CURRENT_DATE, CAST(o.birth_date AS DATE))) < 40 THEN 'Moins de 40 ans'
            WHEN DATE_PART('year', AGE(CURRENT_DATE, CAST(o.birth_date AS DATE))) < 60 THEN '40-59 ans'
            WHEN DATE_PART('year', AGE(CURRENT_DATE, CAST(o.birth_date AS DATE))) < 75 THEN '60-74 ans'
            ELSE '75 ans et plus'
        END AS owner_age_category,
        
        -- Owner Generation
        CASE 
            WHEN o.kind_class NOT ILIKE '%particulier%' THEN 'Non applicable'
            WHEN o.birth_date IS NULL THEN 'Inconnu'
            WHEN DATE_PART('year', o.birth_date) < 1946 THEN 'Silent Generation'
            WHEN DATE_PART('year', o.birth_date) < 1965 THEN 'Baby Boomer'
            WHEN DATE_PART('year', o.birth_date) < 1981 THEN 'Generation X'
            WHEN DATE_PART('year', o.birth_date) < 1997 THEN 'Millennial'
            ELSE 'Generation Z'
        END AS owner_generation,
        
        -- Owner Location
        o.postal_code AS owner_postal_code,
        o.city AS owner_city,
        CASE 
            WHEN o.postal_code IS NOT NULL AND LENGTH(o.postal_code) >= 2
            THEN LEFT(o.postal_code, 2)
            ELSE NULL
        END AS owner_department_code,
        
        -- Location Relative to Housing
        oh.locprop_relative_ban,
        CASE 
            WHEN oh.locprop_relative_ban = 0 THEN 'Meme commune'
            WHEN oh.locprop_relative_ban = 1 THEN 'Meme departement'
            WHEN oh.locprop_relative_ban = 2 THEN 'Meme region'
            WHEN oh.locprop_relative_ban = 3 THEN 'Autre region'
            ELSE 'Inconnu'
        END AS owner_location_relative_label,
        CASE 
            WHEN oh.locprop_relative_ban IN (0, 1) THEN TRUE
            ELSE FALSE
        END AS owner_is_local,
        CASE 
            WHEN oh.locprop_relative_ban = 3 THEN TRUE
            ELSE FALSE
        END AS owner_is_distant,
        
        -- Distance to Housing
        oh.locprop_distance_ban,
        CASE 
            WHEN oh.locprop_distance_ban IS NOT NULL 
            THEN oh.locprop_distance_ban / 1000.0
            ELSE NULL
        END AS owner_distance_km,
        CASE 
            WHEN oh.locprop_distance_ban IS NULL THEN 'Inconnu'
            WHEN oh.locprop_distance_ban < 5000 THEN 'Moins de 5 km'
            WHEN oh.locprop_distance_ban < 20000 THEN '5-20 km'
            WHEN oh.locprop_distance_ban < 50000 THEN '20-50 km'
            WHEN oh.locprop_distance_ban < 100000 THEN '50-100 km'
            ELSE 'Plus de 100 km'
        END AS owner_distance_category,
        
        -- Property Rights
        oh.property_right,
        CASE 
            WHEN oh.property_right ILIKE '%pleine%' OR oh.property_right ILIKE '%propriete%' THEN 'Pleine propriete'
            WHEN oh.property_right ILIKE '%nu%' OR oh.property_right ILIKE '%usufruit%' THEN 'Demembrement'
            WHEN oh.property_right IS NULL THEN 'Inconnu'
            ELSE 'Autre'
        END AS property_right_category,
        CASE 
            WHEN oh.property_right ILIKE '%pleine%' OR oh.property_right ILIKE '%propriete%' THEN TRUE
            ELSE FALSE
        END AS owner_is_full_owner,
        
        -- Multi-ownership
        COALESCE(ohc.owner_housing_count, 1) AS owner_housing_count,
        CASE 
            WHEN COALESCE(ohc.owner_housing_count, 1) > 1 THEN TRUE
            ELSE FALSE
        END AS owner_is_multi_owner,
        CASE 
            WHEN COALESCE(ohc.owner_housing_count, 1) = 1 THEN '1 logement'
            WHEN COALESCE(ohc.owner_housing_count, 1) <= 5 THEN '2-5 logements'
            WHEN COALESCE(ohc.owner_housing_count, 1) <= 10 THEN '6-10 logements'
            ELSE 'Plus de 10 logements'
        END AS owner_portfolio_category,
        
        -- Owner Contact Info
        CASE WHEN o.email IS NOT NULL AND o.email != '' THEN TRUE ELSE FALSE END AS owner_has_email,
        CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN TRUE ELSE FALSE END AS owner_has_phone,
        CASE 
            WHEN (o.email IS NOT NULL AND o.email != '') 
                 OR (o.phone IS NOT NULL AND o.phone != '') 
            THEN TRUE 
            ELSE FALSE 
        END AS owner_contactable

    FROM housing_base h
    LEFT JOIN owners_housing oh ON CAST(h.housing_id AS UUID) = oh.housing_id
    LEFT JOIN owners o ON oh.owner_id = o.owner_id
    LEFT JOIN owner_housing_counts ohc ON oh.owner_id = ohc.owner_id
)

SELECT * FROM joined
