SELECT
    ff_owner_idpersonne,
    array_agg(ff_owner_idprodroit) AS ff_owner_idprodroit,
    array_agg(ff_owner_idprocpte) AS ff_owner_idprocpte,
    max(ff_owner_address_1) AS ff_owner_address_1,
    max(ff_owner_address_2) AS ff_owner_address_2,
    max(ff_owner_address_3) AS ff_owner_address_3,
    max(ff_owner_address_4) AS ff_owner_address_4,
    max(ff_owner_postal_code) AS ff_owner_postal_code,
    max(ff_owner_birth_date) AS ff_owner_birth_date,
    max(ff_owner_lastname) AS ff_owner_lastname,
    max(ff_owner_firstname) AS ff_owner_firstname,
    max(ff_owner_firstnames) AS ff_owner_firstnames,
    max(ff_owner_birth_lastname) AS ff_owner_birth_lastname,
    max(ff_owner_city) AS ff_owner_city,
    max(ff_owner_fullname) AS ff_owner_fullname,
    max(ff_locprop) AS ff_locprop,
    max(ff_locproptxt) AS ff_locproptxt,
    max(ff_owner_category) AS ff_owner_category,
    max(ff_owner_category_text) AS ff_owner_category_text
FROM {{ ref ('stg_ff_owners') }}
GROUP BY ff_owner_idpersonne
