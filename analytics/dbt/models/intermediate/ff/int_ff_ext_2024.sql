SELECT *
FROM {{ ref ('stg_lovac_ff_ext_2024') }}
WHERE ff_dteloc IN ('1', '2')
AND (ff_ccogrm NOT IN ('1', '2', '3', '4', '5', '6', '9') OR ff_ccogrm IS NULL)
