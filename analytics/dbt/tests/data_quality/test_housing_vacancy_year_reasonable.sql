-- Test: Vérifier que les années de début de vacance sont raisonnables
-- Plage acceptable: 1950 (post-guerre) à année courante

{{ config(severity='warn', warn_if='>100', error_if='>1000') }}

SELECT 
    housing_id, 
    vacancy_start_year, 
    'Année de vacance invalide (< 1950 ou > année courante)' as issue
FROM {{ ref('marts_production_housing') }}
WHERE vacancy_start_year IS NOT NULL 
  AND (vacancy_start_year < 1950 OR vacancy_start_year > EXTRACT(YEAR FROM CURRENT_DATE))
