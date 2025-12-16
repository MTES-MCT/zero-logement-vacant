-- Test: Vérifier que int_production_events contient bien les deux versions (old et new)
-- Ce test échoue si une des versions est manquante ou vide.

WITH version_counts AS (
    SELECT 
        version,
        COUNT(*) as event_count
    FROM {{ ref('int_production_events') }}
    GROUP BY version
)

-- Le test échoue si :
-- 1. Il n'y a pas de version 'old'
-- 2. Il n'y a pas de version 'new'
-- 3. Une version a 0 événements (ne devrait pas arriver mais sécurité)
SELECT 
    'Version manquante ou vide' as issue,
    (SELECT COUNT(*) FROM version_counts WHERE version = 'old' AND event_count > 0) as old_exists,
    (SELECT COUNT(*) FROM version_counts WHERE version = 'new' AND event_count > 0) as new_exists
WHERE 
    (SELECT COUNT(*) FROM version_counts WHERE version = 'old' AND event_count > 0) = 0
    OR (SELECT COUNT(*) FROM version_counts WHERE version = 'new' AND event_count > 0) = 0


