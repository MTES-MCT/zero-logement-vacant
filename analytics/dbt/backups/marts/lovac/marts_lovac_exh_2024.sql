SELECT
    local_id,
    geo_code,
    ff_ccthp,
    groupe,
    vacancy_start_year,
    aff
FROM {{ ref ('int_lovac_ex_2024') }}
ORDER BY local_id ASC
