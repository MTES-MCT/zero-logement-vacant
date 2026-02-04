-- Test: Vérifier que les établissements actifs ont au moins un utilisateur
-- Un établissement actif (is_active = true) devrait avoir au moins un utilisateur inscrit

{{ config(severity='warn', warn_if='>10', error_if='>50') }}

SELECT 
    establishment_id, 
    name,
    user_number, 
    'Établissement actif sans utilisateur' as issue
FROM {{ ref('marts_production_establishments') }}
WHERE is_active = true 
  AND (user_number IS NULL OR user_number = 0)
