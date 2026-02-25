-- Maps each housing to its EPCI (CA/CC/CU/ME) and Commune establishment
-- Used by marts_bi_housing_zlv_usage for dual-echelon establishment features
-- One row per housing_id

WITH housing_base AS (
    SELECT
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

establishment_localities AS (
    SELECT
        CAST(el.establishment_id AS VARCHAR) AS establishment_id,
        el.geo_code,
        e.kind
    FROM {{ ref('int_production_establishments_localities') }} el
    JOIN {{ ref('marts_production_establishments') }} e
        ON CAST(el.establishment_id AS VARCHAR) = e.establishment_id
    WHERE e.kind IN ('CA', 'CC', 'CU', 'ME', 'Commune')
),

epci_per_geocode AS (
    SELECT DISTINCT ON (geo_code)
        geo_code,
        establishment_id AS epci_establishment_id
    FROM establishment_localities
    WHERE kind IN ('CA', 'CC', 'CU', 'ME')
),

commune_per_geocode AS (
    SELECT DISTINCT ON (geo_code)
        geo_code,
        establishment_id AS city_establishment_id
    FROM establishment_localities
    WHERE kind = 'Commune'
)

SELECT
    CAST(h.housing_id AS VARCHAR) AS housing_id,
    epci.epci_establishment_id,
    commune.city_establishment_id
FROM housing_base h
LEFT JOIN epci_per_geocode epci ON h.geo_code = epci.geo_code
LEFT JOIN commune_per_geocode commune ON h.geo_code = commune.geo_code
