SELECT 
	ownership_score,
    local_id,
    ff_owner_idpersonne as "idpersonne",
	ownership_score_reason,
	IF(ownership_score > 2, FALSE, TRUE) as "conflict",
    owner_birth_date,
    owner_fullname,
    owner_postal_code,
    ff_owner_idprodroit as "idprodroit",
    ff_owner_idprocpte as "idprocpte",
    ff_owner_locprop as "locprop",
    rank, 
    geo_code,
    old_rank
    FROM {{ ref('int_zlovac_owner_housing') }}
    ORDER BY local_id ASC
