SELECT
    idpersonne AS ff_owner_idpersonne,
    idprodroit AS ff_owner_idprodroit,
    idprocpte AS ff_owner_idprocpte,
    dlign3 AS ff_owner_address_1,
    dlign4 AS ff_owner_address_2,
    dlign5 AS ff_owner_address_3,
    dlign6 AS ff_owner_address_4,
    try_strptime(cast(jdatnss AS VARCHAR), '{{ var("dateFormat") }}')
        AS ff_owner_birth_date,
    dnomus AS ff_owner_lastname,
    dprnus AS ff_owner_firstname,
    dprnlp AS ff_owner_firstnames,
    dnomlp AS ff_owner_birth_lastname,
    locprop AS ff_locprop,
    locproptxt AS ff_locproptxt,
    dlign6 AS ff_owner_city,
    regexp_extract(dlign6, '\d{5}') AS ff_owner_postal_code,
    ddenom AS ff_owner_fullname,
    dsiren AS ff_owner_siren,
    catpro3 AS ff_owner_category,
    {{ process_owner_kind ('catpro3') }} AS ff_owner_category_text,
    {{ process_owner_property_rights ('ccodro') }} AS ff_owner_property_rights
FROM {{ source ('duckdb_raw', 'raw_ff_owners') }}
