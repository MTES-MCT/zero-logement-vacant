-- Intermediate model: Housing with exit flag for vacancy analysis
-- Rebased on LOVAC 2026 (PRD 00 — Sortie de la vacance v3)
--
-- Logic:
--   cohort   = units with at least 1 LOVAC tag in 2019–2025
--              (units whose only tag is lovac-2026 are EXCLUDED — see is_2026_new_entrant)
--   exit = 1 when unit is NOT in lovac-2026  (vacance terminée)
--   exit = 0 when unit IS  in lovac-2026     (toujours vacant)
--
-- Key invariants:
--   - No cohort row has vacancy_start_year = 2026 exclusively
--   - is_2026_new_entrant rows are returned with has_lovac_history = TRUE but
--     excluded from the cohort via the final WHERE clause

WITH production_housing AS (
    SELECT
        h.id                                                            AS housing_id,
        h.geo_code,
        -- Keep only lovac-* tags for analysis
        list_filter(h.data_file_years, x -> x LIKE 'lovac-%')          AS lovac_years_present,

        -- Minimum LOVAC year (first year the unit appeared in LOVAC)
        list_min(
            list_transform(
                list_filter(h.data_file_years, x -> x LIKE 'lovac-%'),
                x -> CAST(replace(x, 'lovac-', '') AS INTEGER)
            )
        )                                                               AS vacancy_start_year,

        -- Whether the unit has any LOVAC tag at all
        array_length(list_filter(h.data_file_years, x -> x LIKE 'lovac-%')) > 0
                                                                        AS has_lovac_history,

        -- Whether the unit has a LOVAC tag in 2019-2025 (cohort membership)
        array_length(
            list_filter(h.data_file_years, x -> x LIKE 'lovac-%' AND x != 'lovac-2026')
        ) > 0                                                           AS has_pre2026_lovac,

        -- Whether the unit appears in lovac-2026 (still vacant)
        list_contains(h.data_file_years, 'lovac-2026')                 AS is_in_lovac_2026

    FROM {{ ref('int_production_housing') }} h
),

with_flags AS (
    SELECT
        housing_id,
        geo_code,
        vacancy_start_year,
        has_lovac_history,
        lovac_years_present,

        -- 2026-only new entrant: first (and only) LOVAC appearance is 2026
        -- These units had zero exit opportunity — excluded from cohort
        (has_lovac_history AND NOT has_pre2026_lovac)                   AS is_2026_new_entrant,

        -- Exit flag (cohort rows only):
        --   1 = was in LOVAC 2019–2025 and absent from lovac-2026
        --   0 = was in LOVAC 2019–2025 and still present in lovac-2026
        CASE
            WHEN has_pre2026_lovac AND NOT is_in_lovac_2026 THEN 1
            WHEN has_pre2026_lovac AND     is_in_lovac_2026 THEN 0
            ELSE NULL   -- 2026-only new entrant, will be filtered below
        END                                                             AS is_housing_out,

        -- Human-readable label (French)
        CASE
            WHEN has_pre2026_lovac AND NOT is_in_lovac_2026 THEN 'Sorti de vacance'
            WHEN has_pre2026_lovac AND     is_in_lovac_2026 THEN 'Toujours vacant'
            ELSE 'Nouvel entrant 2026'
        END                                                             AS vacancy_status_label,

        -- Years in vacancy measured at the 2026 reference year
        CASE
            WHEN vacancy_start_year IS NOT NULL AND vacancy_start_year > 0
            THEN 2026 - vacancy_start_year
            ELSE NULL
        END                                                             AS years_in_vacancy,

        -- Duration category (reference year 2026, consistent with PRD)
        CASE
            WHEN vacancy_start_year IS NULL OR vacancy_start_year <= 0 THEN 'Inconnu'
            WHEN 2026 - vacancy_start_year <= 2                        THEN '0-2 ans'
            WHEN 2026 - vacancy_start_year <= 5                        THEN '3-5 ans'
            WHEN 2026 - vacancy_start_year <= 10                       THEN '6-10 ans'
            ELSE 'Plus de 10 ans'
        END                                                             AS vacancy_duration_category

    FROM production_housing
    WHERE has_lovac_history = TRUE
)

SELECT *
FROM with_flags
-- Cohort = units with ≥1 lovac tag in 2019–2025
-- 2026-only new entrants are EXCLUDED (is_2026_new_entrant = TRUE)
WHERE is_2026_new_entrant = FALSE
