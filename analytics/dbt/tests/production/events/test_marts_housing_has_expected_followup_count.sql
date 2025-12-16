-- Test de non-régression: Vérifier que le nombre de logements en suivi
-- ne chute pas de manière anormale (seuil: 20 000 minimum)
-- 
-- Contexte: En octobre 2025, ce chiffre était à 28 000.
-- Une chute en dessous de 20 000 indique probablement un bug.
--
-- Ajuster ce seuil selon vos attentes métier.

WITH followup_count AS (
    SELECT COUNT(*) as total
    FROM {{ ref('marts_production_housing') }}
    WHERE last_event_status_label_user_followup IN ('Suivi en cours', 'Suivi terminé')
)

SELECT 
    total,
    20000 as minimum_expected,
    'Nombre de logements en suivi en dessous du seuil attendu' as issue
FROM followup_count
WHERE total < 20000


