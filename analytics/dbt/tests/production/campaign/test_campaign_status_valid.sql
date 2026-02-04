-- Test: Vérifier que les statuts de campagne sont valides
-- Statuts autorisés: draft, in-progress, sending, archived

SELECT 
    id, 
    status, 
    'Statut campagne invalide' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE status NOT IN ('draft', 'in-progress', 'sending', 'archived')
