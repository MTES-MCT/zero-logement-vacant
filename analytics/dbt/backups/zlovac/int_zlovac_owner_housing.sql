


WITH owner_housing as (
    SELECT 
    ff_owners.ff_owner_idprodroit as ff_owner_idprodroit,
    zlovac.local_id,
    zlovac_housing.geo_code as geo_code,
    COALESCE(zlovac.ff_owner_birth_date, ff_owners.ff_owner_birth_date) as owner_birth_date,
    zlovac.ff_owner_fullname as owner_fullname,
    zlovac.ff_owner_postal_code as owner_postal_code,
    ff_owners.ff_owner_idpersonne as ff_owner_idpersonne,
    zlovac.final_owner_score as ownership_score,
    zlovac.final_owner_reason  as ownership_score_reason,
    COALESCE(ff_owners.ff_owner_idprocpte, ff_owners.ff_owner_idprocpte) as ff_owner_idprocpte,
    ff_owners.ff_owner_category_text as ff_owner_category_text,
    zlovac.ff_owner_locprop as ff_owner_locprop,
    zlovac.rank as rank, 
    zlovac.old_rank as old_rank
FROM {{ ref('int_zlovac_owner_housing_scored') }} as zlovac
LEFT OUTER JOIN {{ ref('stg_ff_owners') }} as ff_owners
    ON ff_owners.ff_owner_idprodroit = zlovac.ff_owner_idprodroit
LEFT JOIN {{ ref('int_zlovac') }} as zlovac_housing
    ON zlovac_housing.local_id = zlovac.local_id
WHERE zlovac.ff_owner_fullname IS NOT NULL
)
SELECT 
    owner_housing.*,
    NULL as conflict
FROM owner_housing
