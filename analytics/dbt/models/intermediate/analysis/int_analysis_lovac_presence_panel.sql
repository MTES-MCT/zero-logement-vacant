-- Intermediate model: LOVAC presence panel for DiD analysis (PRD 00 — Sortie de la vacance v3)
-- Grain: 1 row per (cohort housing unit × LOVAC year)
-- Source: int_lovac_history_housing provides a comma-separated file_years string.
-- Only cohort units (present in int_analysis_housing_with_out_flag) are included.
-- Per-year commune dispositif membership is added:
--   - TLV (stg_external_dgfip_liste_communes_tlv): year-stamped zonage fields
--   - ORT (marts_common_cities): ort_signed_at date → is_in_ort_at_year
-- NOTE: int_lovac_history_housing is a view over all int_lovac_fil_* tables; it
-- returns local_id (LOVAC unit identifier) and file_years (comma-separated string
-- 'lovac-2019,lovac-2021,...'). We JOIN on local_id via int_production_housing.
--
-- Materialized as a TABLE: it unnests a heavy UNION-ALL view (int_lovac_history_housing)
-- and Axis C (DiD) reads it repeatedly — a view times out on read.

{{ config(materialized='table') }}

WITH cohort AS (
    SELECT
        housing_id,
        geo_code
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

-- Map housing_id (UUID from production) to local_id (LOVAC identifier)
housing_local_id AS (
    SELECT
        CAST(h.id AS VARCHAR)      AS housing_id,
        h.local_id,
        h.geo_code
    FROM {{ ref('int_production_housing') }} h
    -- Keep only cohort units
    INNER JOIN cohort c ON CAST(h.id AS VARCHAR) = c.housing_id
),

-- Get LOVAC history: local_id → file_years comma-separated string
lovac_history AS (
    SELECT
        lh.local_id,
        lh.file_years
    FROM {{ ref('int_lovac_history_housing') }} lh
    -- Only units that appear in the cohort (via housing_local_id)
    INNER JOIN housing_local_id hli ON lh.local_id = hli.local_id
),

-- Unnest years: split comma-separated file_years into one row per year
-- DuckDB: string_split returns a list, unnest expands it
lovac_years_unnested AS (
    SELECT
        lh.local_id,
        CAST(REPLACE(TRIM(year_tag), 'lovac-', '') AS INTEGER) AS lovac_year
    FROM lovac_history lh,
    UNNEST(string_split(lh.file_years, ',')) AS t(year_tag)
    WHERE TRIM(year_tag) LIKE 'lovac-%'
),

-- Build panel: (housing_id, lovac_year, is_present=1)
-- Only years 2019–2026
panel_raw AS (
    SELECT
        hli.housing_id,
        hli.geo_code,
        lyu.lovac_year,
        TRUE                        AS is_present_in_lovac
    FROM lovac_years_unnested lyu
    INNER JOIN housing_local_id hli ON lyu.local_id = hli.local_id
    WHERE lyu.lovac_year BETWEEN 2019 AND 2026
),

-- City mapping for arrondissements
city_mapping AS (
    SELECT geo_code, city_code
    FROM {{ ref('int_common_cities_mapping') }}
),

-- TLV commune lists: year-stamped (2013, 2023, 2026 editions)
-- Columns: geo_code, tlv_2013, tlv_2023, tlv_2026
tlv_source AS (
    SELECT
        geo_code,
        tlv_2013,
        tlv_2023,
        tlv_2026
    FROM {{ ref('stg_external_dgfip_liste_communes_tlv') }}
),

-- ORT: ort_signed_at from marts_common_cities
ort_source AS (
    SELECT
        city_code,
        ort_signed,
        ort_signed_at
    FROM {{ ref('marts_common_cities') }}
    WHERE ort_signed = TRUE
),

-- =====================================================
-- FINAL PANEL
-- =====================================================
final AS (
    SELECT
        p.housing_id,
        p.geo_code,
        cm.city_code,
        p.lovac_year,
        p.is_present_in_lovac,

        -- ---- PER-YEAR TLV MEMBERSHIP ----
        -- TLV edition 1 (from 2013): active since 2013
        CASE
            WHEN tlv.tlv_2013 = 'TLV' AND p.lovac_year >= 2013 THEN TRUE
            ELSE FALSE
        END                         AS is_in_tlv1_at_year,

        -- TLV edition 2 (from 2023 — article 1): active since 2023
        CASE
            WHEN tlv.tlv_2023 LIKE '1.%' AND p.lovac_year >= 2023 THEN TRUE
            ELSE FALSE
        END                         AS is_in_tlv2_at_year,

        -- TLV 2026 update (post décret 22/12/2025): active since 2026
        CASE
            WHEN tlv.tlv_2026 LIKE '1.%' AND p.lovac_year >= 2026 THEN TRUE
            ELSE FALSE
        END                         AS is_in_tlv_2026_at_year,

        -- Any TLV applicable at this year
        CASE
            WHEN (tlv.tlv_2013 = 'TLV' AND p.lovac_year >= 2013)
                OR (tlv.tlv_2023 LIKE '1.%' AND p.lovac_year >= 2023)
                OR (tlv.tlv_2026 LIKE '1.%' AND p.lovac_year >= 2026)
            THEN TRUE
            ELSE FALSE
        END                         AS is_in_any_tlv_at_year,

        -- ---- PER-YEAR ORT MEMBERSHIP ----
        -- ORT: active if ort_signed_at year <= lovac_year
        CASE
            WHEN ort.ort_signed_at IS NOT NULL
                AND EXTRACT(YEAR FROM CAST(ort.ort_signed_at AS DATE)) <= p.lovac_year
            THEN TRUE
            ELSE FALSE
        END                         AS is_in_ort_at_year,

        ort.ort_signed_at

    FROM panel_raw p
    LEFT JOIN city_mapping cm
        ON p.geo_code = cm.geo_code
    LEFT JOIN tlv_source tlv
        ON p.geo_code = tlv.geo_code
    LEFT JOIN ort_source ort
        ON cm.city_code = ort.city_code
)

SELECT * FROM final
