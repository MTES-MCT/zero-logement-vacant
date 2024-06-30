SELECT 
    idpersonne  as ff_owner_idpersonne,
    idprodroit as ff_owner_idprodroit,
    idprocpte as ff_owner_idprocpte,
    dlign3 as ff_owner_address_1,
    dlign4 as ff_owner_address_2,
    dlign5 as ff_owner_address_3,
    dlign6 as ff_owner_address_4,
    try_strptime(CAST(jdatnss AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_birth_date,
    dnomus as ff_owner_lastname,
    dprnus as ff_owner_firstname,
    dlign6 as ff_owner_city,
    REGEXP_EXTRACT(dlign6, '\d{5}') AS ff_owner_postal_code,
    ddenom as ff_owner_fullname,
    dsiren as ff_owner_siren,
    catpro3 as ff_owner_category,
    {{ process_owner_kind('catpro3') }} AS ff_owner_category_text,
    {{ process_owner_code_droit('ccodro') }} AS ff_owner_code_droit
FROM {{ source('duckdb_raw', 'raw_ff_owners') }}