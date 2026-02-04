-- Test: Vérifier que les surfaces habitables sont raisonnables
-- Plage acceptable: 1 m² (minimum légal) à 10000 m² (limite haute raisonnable)

{{ config(severity='warn', warn_if='>100', error_if='>1000') }}

SELECT 
    housing_id, 
    living_area, 
    'Surface habitable invalide (< 1 ou > 10000 m²)' as issue
FROM {{ ref('marts_production_housing') }}
WHERE living_area IS NOT NULL 
  AND (living_area < 1 OR living_area > 10000)
