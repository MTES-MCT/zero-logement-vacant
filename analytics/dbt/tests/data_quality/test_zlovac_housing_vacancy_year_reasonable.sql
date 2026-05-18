-- Test: int_zlovac_housing.vacancy_start_year >= 1900.
-- Upstream filter (filter_lovac vacancy=True) already enforces < data_year - 2.

{{ config(severity='warn', warn_if='>0', error_if='>1000') }}

SELECT
    local_id,
    vacancy_start_year,
    'vacancy_start_year < 1900 (data error)' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE vacancy_start_year IS NOT NULL
  AND vacancy_start_year < 1900
