

with source as (
    SELECT *
    FROM {{ source ('duckdb_raw', 'raw_ff_2024_owners') }}
)

SELECT idpersonne as owner_idpersonne,
        idprodroit as owner_idprodroit,
        idprocpte as owner_idprocpte,
        TRY_CAST(ccogrm as INTEGER) as entity,
        UPPER(ddenom) as owner_fullname,
        TRY_STRPTIME(CAST(jdatnss as VARCHAR), '{{ var("dateFormat") }}') as owner_birth_date,
        dldnss as owner_birth_place,
        dsiren as owner_siren,
        CONCAT(dlign3,dlign4,dlign5,dlign6) owner_address,
        REGEXP_EXTRACT(dlign6, '\d{5}') as owner_postal_code,
        catpro2txt as owner_kind, 
        {{ process_owner_kind ('catpro3') }} AS owner_kind_detail,
        {{ process_owner_kind ('catpro3') }} AS owner_category_text,
        {{ process_owner_property_rights_light ('ccodro') }} AS owner_property_rights,
        {{ process_owner_property_rights('ccodro') }} as owner_property_rights_detail,
        *
  FROM source
