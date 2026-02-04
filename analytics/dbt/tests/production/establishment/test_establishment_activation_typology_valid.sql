-- Test: Vérifier que la typologie d'activation est valide
-- Typologies autorisées selon le modèle marts_production_establishments_activation

SELECT 
    establishment_id, 
    typologie_activation_simple, 
    'Typologie activation simple invalide' as issue
FROM {{ ref('marts_production_establishments_activation') }}
WHERE typologie_activation_simple NOT IN (
    '(1) CT inactive', 
    '(2) CT en analyse', 
    '(3) CT en campagne', 
    '(4) CT activée', 
    'Erreur de classification'
)

UNION ALL

SELECT 
    establishment_id, 
    typologie_activation_detaillee, 
    'Typologie activation détaillée invalide' as issue
FROM {{ ref('marts_production_establishments_activation') }}
WHERE typologie_activation_detaillee NOT IN (
    '(1.1) CT inactive et fantôme',
    '(1.2) CT inactive et visiteuse',
    '(2.1) CT en analyse et fantôme',
    '(2.2) CT en analyse et visiteuse',
    '(3.1) CT en campagne et fantôme',
    '(3.2) CT en campagne et visiteuse',
    '(4.1) CT pro-active et fantôme',
    '(4.2) CT pro-active et visiteuse',
    '(5.1) CT exemplaire et fantôme',
    '(5.2) CT exemplaire et visiteuse',
    'Erreur de classification'
)
