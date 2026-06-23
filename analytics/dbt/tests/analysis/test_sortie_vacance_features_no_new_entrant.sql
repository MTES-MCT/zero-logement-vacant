-- Test : aucun logement "nouvel entrant 2026" (uniquement tag lovac-2026) ne doit
-- figurer dans marts_analysis_sortie_vacance_features. Ces unités sont exclues de
-- la cohorte dans int_analysis_housing_with_out_flag.

{{ config(severity='error', error_if='>0') }}

WITH production_housing AS (
    SELECT
        CAST(id AS VARCHAR) AS housing_id,
        data_file_years
    FROM {{ ref('int_production_housing') }}
),

new_entrants AS (
    SELECT
        ph.housing_id
    FROM production_housing ph
    WHERE
        -- Only tag is lovac-2026 (2026-only new entrant)
        list_contains(ph.data_file_years, 'lovac-2026')
        AND array_length(
            list_filter(ph.data_file_years, x -> x LIKE 'lovac-%' AND x != 'lovac-2026')
        ) = 0
),

violations AS (
    SELECT
        f.housing_id,
        'Logement nouvel entrant 2026 présent dans la cohorte' AS issue
    FROM {{ ref('marts_analysis_sortie_vacance_features') }} f
    INNER JOIN new_entrants ne ON f.housing_id = ne.housing_id
)

SELECT * FROM violations
