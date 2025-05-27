SELECT 
    DISTINCT ON (owner_idpersonne)
    owner_idprodroit
    owner_idprocpte,
    entity,
    owner_fullname,
    owner_birth_date,
    owner_birth_place,
    owner_siren,
    owner_address,
    owner_postal_code,
    owner_kind,
    owner_kind_detail,
    owner_category_text
FROM {{ ref ('stg_ff_owners_2024') }}