


WITH owner_housing AS (
    SELECT
        zlovac.ff_owner_idprodroit,
        zlovac.ff_owner_idpersonne,
        zlovac.local_id,
        zlovac_housing.geo_code,
        zlovac.ff_owner_fullname AS owner_fullname,
        zlovac.final_owner_score AS ownership_score,
        zlovac.final_owner_reason AS ownership_score_reason,
        zlovac_housing.ff_idprocpte AS ff_owner_idprocpte,
        zlovac.rank,
        zlovac.old_rank, 
        zlovac.ff_owner_locprop AS owner_locprop
    FROM {{ ref ('int_zlovac_owner_housing_scored') }} as zlovac
    LEFT JOIN {{ ref ('int_zlovac') }} as zlovac_housing
    ON zlovac_housing.local_id = zlovac.local_id
    WHERE zlovac.ff_owner_fullname IS NOT NULL
)

SELECT
    owner_housing.*,
    NULL AS conflict
FROM owner_housing
