-- int_zlovac_owners.sql
-- Gold Owners table for LOVAC 2026.
-- Generates a DETERMINISTIC owner_uid (UUID v5, SHA1-based) keyed on
-- (normalized fullname, normalized address) via the zlovac_owner_uid macro.
-- Multiple FF idpersonnes for the same legal entity (same fullname + address)
-- therefore collapse to one owner_uid.
--
-- Dedup strategy:
--   1. DISTINCT ON (dedup_key) keeps best attributes per FF idpersonne / fullname.
--   2. DISTINCT ON (owner_uid) collapses multiple dedup_keys sharing same uid.
--
-- Materialized as a table so the generated UUIDs are stable and indexable.

{{ config(materialized='table') }}

WITH all_owners AS (
    SELECT DISTINCT ON (dedup_key)
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
        'lovac' AS data_source
    FROM {{ ref('int_zlovac_unique_owners') }}
    WHERE dedup_key IS NOT NULL
    ORDER BY dedup_key,
        owner_birth_date NULLS LAST,
        owner_siren NULLS LAST,
        owner_kind_detail NULLS LAST
),

with_uid AS (
    SELECT
        {{ zlovac_owner_uid('owner_fullname', 'owner_address') }} AS owner_uid,
        *
    FROM all_owners
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
FROM with_uid
ORDER BY owner_uid,
    owner_idpersonne NULLS LAST,
    owner_birth_date NULLS LAST,
    owner_siren NULLS LAST
