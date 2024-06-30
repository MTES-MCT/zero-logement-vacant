SELECT ff_owner_idpersonne,
       array_agg(ff_owner_idprodroit) as ff_owner_idprodroit,
       array_agg(ff_owner_idprocpte) as ff_owner_idprocpte,
        max(ff_owner_address_1) as ff_owner_address_1,
        max(ff_owner_address_2) as ff_owner_address_2,
        max(ff_owner_address_3) as ff_owner_address_3,
        max(ff_owner_address_4) as ff_owner_address_4,
        max(ff_owner_postal_code) as ff_owner_postal_code,
        max(ff_owner_birth_date) as ff_owner_birth_date,
        max(ff_owner_lastname) as ff_owner_lastname,
        max(ff_owner_firstname) as ff_owner_firstname,
        max(ff_owner_city) as ff_owner_city,
        max(ff_owner_fullname) as ff_owner_fullname,
        max(ff_owner_category) as ff_owner_category,
        max(ff_owner_category_text) as ff_owner_category_text
FROM {{ ref('stg_ff_owners') }}
GROUP BY ff_owner_idpersonne