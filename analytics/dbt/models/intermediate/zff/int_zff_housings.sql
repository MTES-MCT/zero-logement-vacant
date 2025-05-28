SELECT h.*, 
extff.ff_dnbbai, 
extff.ff_dnbdou, 
extff.ff_dnbwc, 
extff.ff_dcapec2, 
extff.ff_dcntpa
FROM {{ ref ('stg_ff_housing_2024') }} h

LEFT JOIN {{ ref ('stg_lovac_ff_ext_2024') }} extff ON h.ff_idlocal = extff.ff_idlocal

WHERE dteloc IN ('1', '2')
AND h.ff_ccthp = 'L'
-- ccoaff = 'H'