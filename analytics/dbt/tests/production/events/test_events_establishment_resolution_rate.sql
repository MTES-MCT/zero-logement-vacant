-- Test: la quasi-totalité des événements utilisateurs doit être rattachable à un
-- établissement.
--
-- Bug historique: int_production_events résolvait l'auteur via
-- int_production_users, qui filtre `deleted_at IS NULL`. Tout événement créé par
-- un utilisateur depuis supprimé perdait donc son establishment_id, et
-- disparaissait de tous les compteurs par établissement (~14% des logements mis
-- à jour, soit ~25 000 logements, dont 19 000 récupérables).
--
-- Depuis la résolution via stg_production_users, seuls restent orphelins les
-- événements dont le created_by est absent de la table users (~6 300 logements,
-- ~3,6%). Le seuil de 6% laisse de la marge sans laisser repasser la régression.

{{ config(severity='error') }}

WITH user_events AS (
    SELECT
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE establishment_id IS NULL) AS unresolved_events
    FROM {{ ref('int_production_events') }}
    WHERE user_source = 'user'
      AND type IN ('housing:status-updated', 'housing:occupancy-updated')
      AND housing_id IS NOT NULL
)

SELECT
    total_events,
    unresolved_events,
    ROUND(unresolved_events::FLOAT / total_events * 100, 2) AS unresolved_pct,
    'Trop d''événements utilisateurs sans établissement rattaché' AS issue
FROM user_events
WHERE total_events > 0
  AND unresolved_events::FLOAT / total_events > 0.06
