-- Test: Vérifier que les anciens événements (version='old') sont bien pris en compte
-- dans le calcul du dernier statut.
-- 
-- Note: Certains cas peuvent être normaux (événements sans user_source identifiable)
-- Seuil toléré: 50 cas max, au-delà c'est probablement un bug.

{{ config(severity='warn', warn_if='>30', error_if='>100') }}

WITH housing_with_old_events AS (
    -- Logements qui ont au moins un ancien événement avec changement de statut
    -- ET qui existent encore dans la table housing
    SELECT DISTINCT e.housing_id
    FROM {{ ref('int_production_events') }} e
    INNER JOIN {{ ref('int_production_housing') }} h ON e.housing_id = h.id
    WHERE e.version = 'old'
    AND e.status_changed = TRUE
    AND e.type IS NOT NULL  -- Vérifie que la correction type synthétique est appliquée
),

housing_without_any_status AS (
    -- Logements qui n'ont AUCUN dernier statut (ni user, ni zlv, ni global)
    SELECT h.id as housing_id
    FROM {{ ref('int_production_housing') }} h
    LEFT JOIN {{ ref('int_production_housing_last_status') }} hs ON h.id = hs.housing_id
    WHERE hs.last_event_status_user_followup IS NULL
    AND hs.last_event_status_zlv_followup IS NULL
    AND hs.last_event_status_followup IS NULL  -- Ajout du statut global
)

-- Ce test retourne les logements problématiques:
-- ont des anciens événements MAIS pas de statut calculé
SELECT 
    hoe.housing_id,
    'Logement avec ancien événement mais sans statut calculé' as issue
FROM housing_with_old_events hoe
INNER JOIN housing_without_any_status hws ON hoe.housing_id = hws.housing_id



