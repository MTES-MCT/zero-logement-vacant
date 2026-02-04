-- Test: Vérifier que les types d'établissement sont valides
-- Types regroupés autorisés: Intercommunalité, Commune, DDT/M, Autre

SELECT 
    establishment_id, 
    establishment_synthetic_type_label, 
    'Type établissement invalide' as issue
FROM {{ ref('marts_production_establishments') }}
WHERE establishment_synthetic_type_label NOT IN (
    'Intercommunalité', 
    'Commune', 
    'DDT/M', 
    'Autre'
)
AND establishment_synthetic_type_label IS NOT NULL
