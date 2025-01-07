


WITH owner_housing AS (
    SELECT
        ff_owners.ff_owner_idprodroit,
        zlovac.local_id,
        zlovac_housing.geo_code,
        COALESCE(zlovac.ff_owner_birth_date, ff_owners.ff_owner_birth_date)
            AS owner_birth_date,
        zlovac.ff_owner_fullname AS owner_fullname,
        zlovac.ff_owner_postal_code AS owner_postal_code,
        ff_owners.ff_owner_idpersonne,
        zlovac.final_owner_score AS ownership_score,
        zlovac.final_owner_reason AS ownership_score_reason,
        COALESCE(ff_owners.ff_owner_idprocpte, ff_owners.ff_owner_idprocpte)
            AS ff_owner_idprocpte,
        ff_owners.ff_owner_category_text,
        zlovac.ff_owner_locprop,
        zlovac.rank,
        zlovac.old_rank
    FROM {{ ref ('int_zlovac_owner_housing_scored') }} as zlovac
    LEFT OUTER JOIN {{ ref ('stg_ff_owners') }} as ff_owners
    ON ff_owners.ff_owner_idprodroit = zlovac.ff_owner_idprodroit
    LEFT JOIN {{ ref ('int_zlovac') }} as zlovac_housing
    ON zlovac_housing.local_id = zlovac.local_id
    WHERE zlovac.ff_owner_fullname IS NOT NULL
)

SELECT
    owner_housing.*,
    NULL AS conflict
FROM owner_housing
