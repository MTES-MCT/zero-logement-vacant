WITH all_owners AS (
    SELECT
    owner_idprodroit,
    owner_fullname,
    owner_address,
    owner_birth_date,
    MAX(ff_owners.ff_owner_idpersonne) AS ff_owner_idpersonne,
    MAX(lovac_owners.owner_kind_detail) AS owner_kind_detail,
    MAX(lovac_owners.owner_code_droit) AS owner_code_droit,
    MAX(ff_owners.ff_owner_idprodroit) AS ff_owner_idprodroit,
    MAX(ff_owners.ff_owner_idprocpte) AS ff_owner_idprocpte,
    MAX(ff_owners.ff_owner_address_1) AS ff_owner_address_1,
    MAX(ff_owners.ff_owner_address_2) AS ff_owner_address_2,
    MAX(ff_owners.ff_owner_address_3) AS ff_owner_address_3,
    MAX(ff_owners.ff_owner_address_4) AS ff_owner_address_4,
    MAX(ff_owners.ff_owner_city) AS ff_owner_city,
    MAX(ff_owners.ff_owner_category) AS ff_owner_category,
    MAX(ff_owners.ff_owner_category_text) AS ff_owner_category_text, 
    MAX(ff_owner_siren) AS ff_owner_siren,
FROM {{ ref('int_zlovac_unique_owners') }} lovac_owners
LEFT OUTER JOIN {{ ref('stg_ff_owners') }} AS ff_owners 
    ON lovac_owners.owner_idprodroit = ff_owners.ff_owner_idprodroit
GROUP BY lovac_owners.owner_idprodroit, owner_fullname, owner_address, owner_birth_date
)
SELECT 
    *
FROM all_owners

