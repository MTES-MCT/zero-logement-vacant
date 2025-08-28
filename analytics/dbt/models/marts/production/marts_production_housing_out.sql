{{
config (
materialized = 'table',
unique_key = 'housing_id',
)
}}
SELECT *,
       list_filter(data_file_years, x -> x LIKE 'lovac-%') AS lovac_years_present
FROM {{ ref ('int_production_housing') }} 
WHERE array_length(
    list_filter(data_file_years, x -> x LIKE 'lovac-%')
) > 0
AND NOT list_contains(data_file_years, 'lovac-2025');

