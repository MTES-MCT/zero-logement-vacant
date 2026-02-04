-- Test de régression: Vérifier que les deux versions d'événements sont présentes
-- 'old' = anciens événements au format texte (historique)
-- 'new' = nouveaux événements au format JSON
-- Si une version disparaît, cela indique un problème dans l'union des événements

{{ config(severity='error') }}

WITH version_counts AS (
    SELECT 
        version, 
        COUNT(*) as cnt
    FROM {{ ref('int_production_events') }}
    WHERE type IN ('housing:status-updated', 'housing:occupancy-updated') 
       OR type IS NULL  -- Les anciens événements ont type = NULL
    GROUP BY version
),
old_count AS (
    SELECT COALESCE(SUM(cnt), 0) as cnt FROM version_counts WHERE version = 'old'
),
new_count AS (
    SELECT COALESCE(SUM(cnt), 0) as cnt FROM version_counts WHERE version = 'new'
)
SELECT 
    'Version old manquante ou vide' as issue,
    (SELECT cnt FROM old_count) as old_events_count
FROM old_count
WHERE (SELECT cnt FROM old_count) = 0

UNION ALL

SELECT 
    'Version new manquante ou vide' as issue,
    (SELECT cnt FROM new_count) as new_events_count
FROM new_count
WHERE (SELECT cnt FROM new_count) = 0
