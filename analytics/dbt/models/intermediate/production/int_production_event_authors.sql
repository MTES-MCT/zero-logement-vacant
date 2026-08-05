-- Auteurs d'événements: tous les utilisateurs, supprimés inclus.
--
-- À utiliser partout où l'on rattache un événement à un établissement.
-- `int_production_users` filtre `deleted_at IS NULL` et convient donc aux
-- effectifs (user_number, connexions), mais pas à l'attribution d'événements:
-- un événement créé par un utilisateur depuis supprimé y perd son
-- établissement et disparaît de tous les compteurs.
--
-- `user_type` est recalculé ici plutôt que repris de `int_production_users`,
-- pour rester renseigné sur un compte supprimé (sans quoi un administrateur ZLV
-- supprimé retombe en 'user').

SELECT
    id,
    establishment_id,
    deleted_at,
    CASE
        WHEN email LIKE '%beta.gouv.fr' THEN 'zlv'
        ELSE 'user'
    END AS user_type
FROM {{ ref ('stg_production_users') }}
