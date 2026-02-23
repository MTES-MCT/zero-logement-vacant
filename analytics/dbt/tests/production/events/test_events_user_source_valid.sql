-- Test: Vérifier que user_source est zlv ou user pour les événements de statut/occupation
-- user_source indique si l'événement provient de l'application ZLV automatiquement ou d'un utilisateur

SELECT 
    id, 
    user_source, 
    type,
    'User source invalide' as issue
FROM {{ ref('int_production_events') }}
WHERE type IN ('housing:status-updated', 'housing:occupancy-updated')
  AND user_source NOT IN ('zlv', 'user')
