-- Test de non-régression: Vérifier que le nombre de logements mis à jour
-- ne chute pas de manière anormale (seuil: 35 000 minimum)
-- 
-- Contexte: En octobre 2025, ce chiffre était à ~46 000.
-- Une chute en dessous de 35 000 indique probablement un bug.
--
-- Note: "Mis à jour" = logements avec un suivi OU une mise à jour d'occupation

WITH updated_count AS (
    SELECT COUNT(DISTINCT housing_id) as total
    FROM {{ ref('marts_production_housing') }}
    WHERE 
        last_event_status_label_user_followup IN (
            'Bloqué', 'Premier contact', 'Suivi en cours', 'Suivi terminé'
        )
        OR last_event_status_label_user_occupancy IN (
            'Autres', 'Dépendance', 'En location', 'Local commercial ou bureau',
            'Local démoli ou divisé', 'Meublé de tourisme', 'Occupé par le propriétaire',
            'Pas d''information', 'Résidence secondaire non louée', 'Vacant'
        )
)

SELECT 
    total,
    35000 as minimum_expected,
    'Nombre de logements mis à jour en dessous du seuil attendu' as issue
FROM updated_count
WHERE total < 35000







