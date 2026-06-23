-- Test: les logements "mis à jour" comptés pour un établissement doivent provenir
-- des événements créés par les UTILISATEURS de cet établissement, pas des logements
-- situés géographiquement sur son territoire.
--
-- Bug historique (attribution géographique): marts_zlv_usage attribuait la mise à
-- jour d'un logement à TOUS les établissements dont le territoire couvre ce logement
-- (commune + EPCI + département + région + DDT...), soit ~25 établissements par
-- logement. Le compte par établissement explosait (somme ~28x trop élevée) et des
-- milliers d'établissements sans aucun utilisateur actif se voyaient crédités.
--
-- Invariant: pour chaque établissement, logements_maj_suivi (resp. occupation) ne peut
-- pas dépasser le nombre de logements distincts effectivement mis à jour par les
-- utilisateurs ('user') de cet établissement dans int_production_events.

{{ config(severity='error') }}

WITH real_followup AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS n_housing
    FROM {{ ref('int_production_events') }}
    WHERE user_source = 'user'
      AND status_changed = TRUE
      AND type IN ('housing:status-updated', 'housing:occupancy-updated')
      AND establishment_id IS NOT NULL
      AND housing_id IS NOT NULL
    GROUP BY establishment_id
),

real_occupancy AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS n_housing
    FROM {{ ref('int_production_events') }}
    WHERE user_source = 'user'
      AND occupancy_changed = TRUE
      AND type IN ('housing:status-updated', 'housing:occupancy-updated')
      AND establishment_id IS NOT NULL
      AND housing_id IS NOT NULL
    GROUP BY establishment_id
)

SELECT
    u.establishment_id,
    u.logements_maj_suivi,
    COALESCE(rf.n_housing, 0) AS real_suivi,
    u.logements_maj_occupation,
    COALESCE(ro.n_housing, 0) AS real_occupation
FROM {{ ref('marts_zlv_usage') }} u
LEFT JOIN real_followup rf ON u.establishment_id = rf.establishment_id
LEFT JOIN real_occupancy ro ON u.establishment_id = ro.establishment_id
WHERE u.logements_maj_suivi > COALESCE(rf.n_housing, 0)
   OR u.logements_maj_occupation > COALESCE(ro.n_housing, 0)
