SELECT 
o.owner_idpersonne,
o.owner_idprodroit,
o.owner_idprocpte,
o.entity,
o.owner_fullname,
o.owner_birth_date,
o.owner_birth_place,
o.owner_siren,
o.owner_address,
o.owner_postal_code,
o.owner_kind,
o.owner_kind_detail,
o.owner_category_text, 
o.owner_property_rights, 
o.owner_property_rights_detail,
o.dqualp,
o.dnomus,
o.dprnus,
o.owner_address_line_3,
o.owner_address_line_4,
o.owner_address_line_5,
o.owner_address_line_6
FROM {{ ref ('int_zff_owners_filtered') }} o 
INNER JOIN {{ ref ('int_zff_owners_housing') }} oh 
ON o.owner_idprodroit = oh.owner_idprodroit
AND o.owner_idprocpte = oh.owner_idprocpte