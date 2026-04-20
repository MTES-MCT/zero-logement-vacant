-- int_zlovac_unique_owners.sql
-- Builds unique owners list from:
-- 1. CER 1767 owners (from int_zlovac_owner_matching, rank 1)
-- 2. FF owners 1..6 (from int_zlovac via macro)

WITH cer_owners AS (
    -- CER 1767 owners (always rank 1 in matching)
    SELECT
        m.ff_owner_idpersonne AS owner_idpersonne,
        z.owner_fullname AS owner_fullname,
        z.owner_raw_address AS owner_address,
        NULL::DATE AS owner_birth_date,
        NULL AS owner_birth_place,
        NULL AS owner_idprodroit,
        NULL AS owner_kind_detail,
        NULL AS owner_property_rights,
        z.owner_kind AS owner_category,
        NULL AS owner_category_text,
        NULL AS owner_siren,
        NULL AS owner_locprop,
        z.owner_postal_code AS owner_postal_code,
        z.owner_city AS owner_city,
        NULL::INTEGER AS owner_entity,
        NULL AS owner_username,
        z.administrator
    FROM {{ ref('int_zlovac_owner_matching') }} m
    JOIN {{ ref('int_zlovac') }} z ON z.local_id = m.local_id
    WHERE m.rank = 1
),

ff_owners AS (
    {{ unique_users_handling_zlovac(index=1) }}
    UNION DISTINCT
    {{ unique_users_handling_zlovac(index=2) }}
    UNION DISTINCT
    {{ unique_users_handling_zlovac(index=3) }}
    UNION DISTINCT
    {{ unique_users_handling_zlovac(index=4) }}
    UNION DISTINCT
    {{ unique_users_handling_zlovac(index=5) }}
    UNION DISTINCT
    {{ unique_users_handling_zlovac(index=6) }}
),

all_owners AS (
    SELECT * FROM cer_owners
    UNION DISTINCT
    SELECT * FROM ff_owners
)

SELECT
    owner_fullname,
    owner_address,
    owner_birth_date,
    owner_birth_place,
    owner_idprodroit,
    owner_idpersonne,
    owner_kind_detail,
    owner_property_rights,
    owner_category,
    owner_category_text,
    owner_siren,
    owner_locprop,
    owner_postal_code,
    owner_city,
    owner_entity,
    owner_username,
    administrator
FROM all_owners
