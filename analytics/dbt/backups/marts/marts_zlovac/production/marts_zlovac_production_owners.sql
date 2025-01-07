SELECT
    owner_fullname AS "full_name",
    owner_birth_date AS "birth_date",
    owner_address AS "dgfip_address",
    ff_owner_idpersonne AS "idpersonne",
    owner_kind_detail AS "ownership_type",
    ff_owner_siren AS "siren"
FROM {{ ref ('int_zlovac_owners') }}
ORDER BY idpersonne ASC
