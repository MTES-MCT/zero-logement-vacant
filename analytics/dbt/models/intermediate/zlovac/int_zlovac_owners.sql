-- int_zlovac_owners.sql
-- Gold Owners table for LOVAC 2026.
-- Dedup by idpersonne when available, by owner_fullname otherwise.
-- Generates exactly ONE owner_uid per dedup_key, used downstream by
-- int_zlovac_owner_housing (joined back via dedup_key).
--
-- Materialized as a table so the generated UUIDs are stable across queries
-- within a single dbt run.

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
)

SELECT
    uuid() AS owner_uid,
    *
FROM all_owners
