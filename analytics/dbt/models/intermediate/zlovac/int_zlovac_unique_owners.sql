-- int_zlovac_unique_owners.sql
-- Canonical owners table: exactly ONE row per dedup_key with deterministic
-- (owner_fullname, owner_address) canonical attributes.
--
-- This is the single source of truth consumed by:
--   - int_zlovac_dedup_key_uid (dedup_key -> owner_uid mapping)
--   - int_zlovac_owners        (gold owners, DISTINCT ON owner_uid)
--   - int_zlovac_owner_housing (joins on dedup_key to retrieve owner_uid)
--
-- Materialized as a table so all downstream consumers read the same
-- canonical (fullname, address) per dedup_key. DISTINCT ON ordering is
-- fully deterministic via owner_idprodroit tiebreaker.

{{ config(materialized='table') }}

WITH matching_with_details AS (
    SELECT
        m.dedup_key,
        m.ff_owner_idpersonne AS owner_idpersonne,
        m.ff_owner_idprodroit AS owner_idprodroit,
        m.ff_owner_locprop AS owner_locprop,
        m.ff_owner_property_rights AS owner_property_rights,
        m.rank,
        -- For CER owners (rank 1): use int_zlovac owner fields
        -- For FF owners (rank != 1): use ff_owner fields from int_zlovac
        CASE WHEN m.rank = 1 THEN z.owner_fullname ELSE m.ff_owner_fullname END AS owner_fullname,
        CASE WHEN m.rank = 1 THEN z.owner_raw_address END AS owner_address,
        CASE WHEN m.rank = 1 THEN z.owner_postal_code END AS owner_postal_code,
        CASE WHEN m.rank = 1 THEN z.owner_city END AS owner_city,
        CASE WHEN m.rank = 1 THEN z.owner_kind END AS owner_category,
        CASE WHEN m.rank = 1 THEN z.administrator END AS administrator
    FROM {{ ref('int_zlovac_owner_matching') }} m
    JOIN {{ ref('int_zlovac') }} z ON z.local_id = m.local_id
),

-- Enrich FF owners with their details from the macro source
ff_details AS (
    {% for i in range(1, 7) %}
    SELECT
        ff_owner_{{ i }}_idpersonne AS owner_idpersonne,
        ff_owner_{{ i }}_fullname AS owner_fullname,
        ff_owner_{{ i }}_raw_address AS owner_address,
        ff_owner_{{ i }}_birth_date AS owner_birth_date,
        ff_owner_{{ i }}_birth_place AS owner_birth_place,
        ff_owner_{{ i }}_kind_detail AS owner_kind_detail,
        ff_owner_{{ i }}_kind AS owner_category,
        ff_owner_{{ i }}_kind_detail AS owner_category_text,
        ff_owner_{{ i }}_siren AS owner_siren,
        ff_owner_{{ i }}_postal_code AS owner_postal_code,
        ff_owner_{{ i }}_city AS owner_city,
        ff_owner_{{ i }}_entity AS owner_entity,
        ff_owner_{{ i }}_username AS owner_username
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_{{ i }}_fullname IS NOT NULL
    {% if not loop.last %}UNION DISTINCT{% endif %}
    {% endfor %}
),

joined AS (
    SELECT
        md.dedup_key,
        md.owner_idpersonne,
        md.owner_idprodroit,
        COALESCE(md.owner_fullname, fd.owner_fullname) AS owner_fullname,
        -- Prefer FF address (canonical, normalized in FF) over CER raw address
        -- so all rows sharing an idpersonne resolve to the same (fullname, address)
        -- and therefore the same owner_uid.
        COALESCE(fd.owner_address, md.owner_address) AS owner_address,
        fd.owner_birth_date,
        fd.owner_birth_place,
        md.owner_property_rights,
        fd.owner_kind_detail,
        COALESCE(md.owner_category, fd.owner_category) AS owner_category,
        fd.owner_category_text,
        fd.owner_siren,
        md.owner_locprop,
        COALESCE(fd.owner_postal_code, md.owner_postal_code) AS owner_postal_code,
        COALESCE(fd.owner_city, md.owner_city) AS owner_city,
        fd.owner_entity,
        fd.owner_username,
        md.administrator,
        md.rank
    FROM matching_with_details md
    LEFT JOIN ff_details fd ON md.owner_idpersonne = fd.owner_idpersonne
)

-- Collapse to exactly one row per dedup_key with a deterministic tiebreaker.
-- ORDER BY rules (in priority):
--   1. Prefer rows with most-populated owner attributes (birth_date, siren, kind_detail)
--   2. Final tiebreaker on owner_idprodroit so ties never resolve non-deterministically
SELECT DISTINCT ON (dedup_key)
    dedup_key,
    owner_idpersonne,
    owner_idprodroit,
    owner_fullname,
    owner_address,
    owner_birth_date,
    owner_birth_place,
    owner_property_rights,
    owner_kind_detail,
    owner_category,
    owner_category_text,
    owner_siren,
    owner_locprop,
    owner_postal_code,
    owner_city,
    owner_entity,
    owner_username,
    administrator
FROM joined
WHERE dedup_key IS NOT NULL
ORDER BY
    dedup_key,
    owner_birth_date NULLS LAST,
    owner_siren NULLS LAST,
    owner_kind_detail NULLS LAST,
    owner_idprodroit NULLS LAST
