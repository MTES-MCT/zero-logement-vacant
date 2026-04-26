-- int_zlovac_unique_owners.sql
-- Builds unique owners list from int_zlovac_owner_matching.
-- Each owner row carries its owner_uid for joining with owner_housing.
-- Owner details come from:
--   - CER 1767 owners (rank 1): fullname, address from int_zlovac
--   - FF owners (rank != 1): fullname, birth_date, etc. from int_zlovac ff_owner fields

WITH matching_with_details AS (
    SELECT
        m.owner_uid,
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

-- Enrich FF owners (rank != 1) with their details from the macro source
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
)

SELECT DISTINCT
    md.owner_uid,
    md.owner_idpersonne,
    md.owner_idprodroit,
    COALESCE(md.owner_fullname, fd.owner_fullname) AS owner_fullname,
    COALESCE(md.owner_address, fd.owner_address) AS owner_address,
    fd.owner_birth_date,
    fd.owner_birth_place,
    md.owner_property_rights,
    fd.owner_kind_detail,
    COALESCE(md.owner_category, fd.owner_category) AS owner_category,
    fd.owner_category_text,
    fd.owner_siren,
    md.owner_locprop,
    COALESCE(md.owner_postal_code, fd.owner_postal_code) AS owner_postal_code,
    COALESCE(md.owner_city, fd.owner_city) AS owner_city,
    fd.owner_entity,
    fd.owner_username,
    md.administrator
FROM matching_with_details md
LEFT JOIN ff_details fd ON md.owner_idpersonne = fd.owner_idpersonne
