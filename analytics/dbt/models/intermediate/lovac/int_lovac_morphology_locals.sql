-- Grain: one row per LOVAC file line, i.e. one row per *local*, all millésimes
-- unioned. LOVAC repeats local_id within a millésime, so this model is NOT at
-- housing grain — see int_lovac_morphology_housing for that.
--
-- Carries the morphology business flags so that the premises count and the
-- housing counts both derive from a single definition instead of being restated
-- in the mart.

{% set millesimes = range(2019, 2027) %}

WITH all_lovac AS (
    {% for millesime in millesimes %}
    SELECT
        {{ millesime }} AS year
        , local_id
        , geo_code
        , vacancy_start_year
        , data_year
        , ff_ccthp
        , housing_kind
        , aff
        , groupe
        , plot_area
        , living_area
    FROM {{ ref('stg_lovac_' ~ millesime) }}
    {%- if not loop.last %}
    UNION ALL
    {% endif %}
    {%- endfor %}
)

SELECT
    year
    , local_id
    , geo_code
    , plot_area
    , living_area
    , CASE
        WHEN (housing_kind IN ('APPART', 'MAISON') AND aff = 'H')
            THEN 1
        ELSE 0
    END AS is_housing
    , CASE
        WHEN (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe IS NULL)
            THEN 1
        ELSE 0
    END AS is_private
    , CASE WHEN vacancy_start_year < data_year - 2 THEN 1 ELSE 0 END
        AS is_vacant_fil
    , CASE
        WHEN (ff_ccthp IN ('V') AND vacancy_start_year < data_year - 2)
            THEN 1
        ELSE 0
    END AS is_vacant_fil_ccthp
FROM all_lovac
