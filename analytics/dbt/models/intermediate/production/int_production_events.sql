-- Résolution de l'auteur d'un événement.
--
-- On lit `stg_production_users` (tous les utilisateurs) et NON
-- `int_production_users` (qui filtre `deleted_at IS NULL`). Sinon tout
-- événement créé par un utilisateur depuis supprimé perd son
-- `establishment_id` (NULL) et n'est plus attribuable à aucun établissement:
-- ~25 000 logements orphelins, dont 19 000 récupérables ici.
--
-- Même raison pour `user_type`: il était calculé dans `int_production_users`,
-- donc NULL pour un utilisateur supprimé, puis ramené à 'user' par le
-- COALESCE ci-dessous. Un administrateur ZLV supprimé était ainsi compté
-- comme un utilisateur de collectivité.
WITH event_authors AS (
    SELECT
        id,
        establishment_id,
        deleted_at,
        CASE
            WHEN email LIKE '%beta.gouv.fr' THEN 'zlv'
            ELSE 'user'
        END AS user_type
    FROM {{ ref ('stg_production_users') }}
),

all_events AS (
    SELECT
        id,
        created_at,
        created_by,
        housing_id,
        type,
        owner_id,
        new_status,
        new_sub_status,
        name,
        simple_name,
        status_changed,
        new_status_raw,
        old_status_raw,
        occupancy_changed,
        new_occupancy,
        old_occupancy,
        version,
        category
    FROM
    {{ ref ('int_production_events_old') }}
    UNION DISTINCT
    SELECT
        id,
        created_at,
        created_by,
        housing_id,
        type,
        owner_id,
        new_status,
        new_sub_status,
        name,
        simple_name,
        status_changed,
        new_status_raw,
        old_status_raw,
        occupancy_changed,
        new_occupancy,
        old_occupancy,
        version,
        category
    FROM
    {{ ref ('int_production_events_new') }}
)
SELECT
    ae.*,
    s.new AS new_status_refined,
    s.new AS event_status_label,
    version as event_version,
    coalesce(u.user_type, 'user') AS user_source,
    CAST(u.establishment_id AS VARCHAR) AS establishment_id,
    -- TRUE si l'auteur a depuis été supprimé: l'événement reste attribué à son
    -- établissement, mais l'utilisateur n'apparaît plus dans les effectifs.
    u.deleted_at IS NOT NULL AS created_by_deleted_user
FROM
    all_events ae
LEFT JOIN event_authors u ON ae.created_by = u.id
LEFT JOIN {{ ref ('status') }} s ON s.status = ae.new_status
