-- Test: Vérifier que la version est old ou new
-- 'old' = anciens événements au format texte (avant migration)
-- 'new' = nouveaux événements au format JSON structuré

SELECT 
    id, 
    version, 
    'Version invalide' as issue
FROM {{ ref('int_production_events') }}
WHERE version NOT IN ('old', 'new')
