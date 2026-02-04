-- Test: Vérifier que les années de construction sont raisonnables
-- Plage acceptable: 1500 (bâtiments historiques) à année courante + 5 (projets en cours)

{{ config(severity='warn', warn_if='>100', error_if='>1000') }}

SELECT 
    housing_id, 
    building_year, 
    'Année de construction invalide (< 1500 ou > année courante + 5)' as issue
FROM {{ ref('marts_production_housing') }}
WHERE building_year IS NOT NULL 
  AND (building_year < 1500 OR building_year > EXTRACT(YEAR FROM CURRENT_DATE) + 5)
