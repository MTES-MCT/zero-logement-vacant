-- int_zlovac_owners.sql
-- Gold Owners table for LOVAC 2026.
-- Maps to Table Owners_26 specification from the LOVAC documentation.

WITH all_owners AS (
    SELECT DISTINCT ON (owner_idpersonne)
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
        'lovac' as data_source
    FROM {{ ref ('int_zlovac_unique_owners') }} lovac_owners
)
SELECT
    *
FROM all_owners
