WITH all_owners AS (
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
)
SELECT
    owner_fullname,
    owner_address,
    owner_birth_date,
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
    owner_entity
FROM all_owners
