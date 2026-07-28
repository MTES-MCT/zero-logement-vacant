-- Regression: LOVAC 2025 introduced the FIL definition without the legacy
-- CCTHP restriction. This cutoff must not move when a new vintage is added.

{{ config(severity='error', error_if='>0') }}

WITH expected AS (
    SELECT
        year,
        geo_code,
        count_vacant_housing_private_fil_public AS actual_count,
        CASE
            WHEN year >= 2025 THEN count_vacant_housing_private_fil
            ELSE count_vacant_housing_private_fil_ccthp
        END AS expected_count
    FROM {{ ref('marts_common_morphology') }}
    WHERE year IN (2024, 2025, 2026)
)

SELECT
    year,
    geo_code,
    actual_count,
    expected_count,
    'Public LOVAC count uses the wrong yearly definition' AS issue
FROM expected
WHERE actual_count IS DISTINCT FROM expected_count
