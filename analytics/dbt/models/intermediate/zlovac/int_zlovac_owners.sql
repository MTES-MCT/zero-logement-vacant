-- int_zlovac_owners.sql
-- Gold Owners table for LOVAC 2026.
-- One row per unique owner_uid (deterministic UUID v5 per canonical
-- fullname + address). Multiple FF idpersonnes for the same legal entity
-- (same fullname + address) collapse to one owner_uid.
--
-- owner_uid is sourced from int_zlovac_dedup_key_uid (canonical mapping),
-- NEVER recomputed via the macro here. Guarantees FK parity with
-- int_zlovac_owner_housing which reads from the same mapping table.

{{ config(materialized='table') }}

WITH all_with_uid AS (
    SELECT
        m.owner_uid,
        uo.dedup_key,
        uo.owner_idpersonne,
        uo.owner_idprodroit,
        uo.owner_fullname,
        uo.owner_address,
        uo.owner_birth_date,
        uo.owner_birth_place,
        uo.owner_kind_detail,
        uo.owner_property_rights,
        uo.owner_category,
        uo.owner_category_text,
        uo.owner_siren,
        uo.owner_postal_code,
        uo.owner_city,
        uo.owner_entity,
        uo.owner_username,
        uo.administrator,
        'lovac' AS data_source
    FROM {{ ref('int_zlovac_unique_owners') }} uo
    JOIN {{ ref('int_zlovac_dedup_key_uid') }} m ON m.dedup_key = uo.dedup_key
)

SELECT DISTINCT ON (owner_uid)
    owner_uid,
    dedup_key,
    owner_idpersonne,
    owner_idprodroit,
    owner_fullname,
    owner_address,
    owner_birth_date,
    owner_birth_place,
    owner_kind_detail,
    owner_property_rights,
    owner_category,
    owner_category_text,
    owner_siren,
    owner_postal_code,
    owner_city,
    owner_entity,
    owner_username,
    administrator,
    data_source
FROM all_with_uid
ORDER BY owner_uid,
    owner_idpersonne NULLS LAST,
    owner_birth_date NULLS LAST,
    owner_siren NULLS LAST,
    owner_idprodroit NULLS LAST
