-- Test de réconciliation: la somme de logements_maj_situation sur tous les
-- établissements doit rester proche du nombre de logements distincts mis à jour
-- par des utilisateurs dans marts_production_housing.
--
-- C'est le test qui garde la question d'origine du ticket ("58 000 côté Housing
-- contre 121 000 côté Usage") sous contrôle. Les deux chiffres ne peuvent pas
-- être égaux par construction:
--   - un logement mis à jour par DEUX établissements compte deux fois dans la
--     somme (écart positif attendu, faible);
--   - un logement dont l'auteur de l'événement est introuvable dans la table
--     users n'est attribué à aucun établissement (écart négatif, ~6 300).
--
-- On borne donc l'écart relatif à 15%. Au-delà, c'est un retour de
-- l'attribution géographique (facteur ~28) ou une perte d'attribution massive.

{{ config(severity='error') }}

WITH usage_total AS (
    SELECT SUM(logements_maj_situation) AS somme_usage
    FROM {{ ref('marts_zlv_usage') }}
),

housing_total AS (
    SELECT COUNT(*) AS logements_distincts
    FROM {{ ref('marts_production_housing') }}
    WHERE last_event_status_label_user_followup IS NOT NULL
       OR last_event_status_label_user_occupancy IS NOT NULL
)

SELECT
    u.somme_usage,
    h.logements_distincts,
    ROUND(
        ABS(u.somme_usage - h.logements_distincts)::FLOAT
        / NULLIF(h.logements_distincts, 0) * 100, 2
    ) AS ecart_pct,
    'Ecart trop important entre marts_zlv_usage et marts_production_housing' AS issue
FROM usage_total u
CROSS JOIN housing_total h
WHERE h.logements_distincts > 0
  AND ABS(u.somme_usage - h.logements_distincts)::FLOAT / h.logements_distincts > 0.15
