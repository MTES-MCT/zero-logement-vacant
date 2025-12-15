-- Test: Vérifier qu'il y a au maximum un seul "dernier statut" par logement
-- dans int_production_housing_last_status

SELECT 
    housing_id,
    COUNT(*) as nb_rows,
    'Plusieurs entrées pour un même logement' as issue
FROM {{ ref('int_production_housing_last_status') }}
GROUP BY housing_id
HAVING COUNT(*) > 1

