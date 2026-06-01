-- int_zlovac_dedup_key_uid.sql
-- Canonical mapping: dedup_key -> owner_uid (deterministic UUID v5).
-- This is the SHARED source of truth for owner_uid resolution. Both
-- int_zlovac_owners and int_zlovac_owner_housing consume this table to
-- guarantee FK integrity: every owner_uid in owner_housing exists in owners.
--
-- The macro {{ zlovac_owner_uid }} is intentionally called ONCE here. Other
-- models must JOIN to retrieve owner_uid, never recompute it.

{{ config(materialized='table') }}

SELECT
    dedup_key,
    {{ zlovac_owner_uid('owner_fullname', 'owner_address', 'owner_idpersonne') }} AS owner_uid
FROM {{ ref('int_zlovac_unique_owners') }}
WHERE dedup_key IS NOT NULL
