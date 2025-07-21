
SELECT h.owner_idprocpte, 
        o.owner_idprodroit, 
        h.locprop, 
        h.locproptxt, 
        o.owner_property_rights, 
        o.owner_property_rights_detail
FROM {{ ref ('int_zff_housings') }} h 
JOIN {{ ref ('int_zff_owners_filtered') }} o ON h.owner_idprocpte = o.owner_idprocpte

