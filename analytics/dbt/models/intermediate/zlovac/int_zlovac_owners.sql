WITH all_owners AS (
    SELECT DISTINCT ON (owner_idpersonne)
        owner_idpersonne,
        owner_idprodroit,
        owner_fullname,
        owner_address,
        owner_birth_date,
        owner_kind_detail,
        owner_property_rights,
        owner_category,
        owner_category_text,
        owner_siren, 
        owner_postal_code,
        owner_city, 
        owner_entity
    FROM {{ ref ('int_zlovac_unique_owners') }} lovac_owners
)
SELECT
    *
FROM all_owners
