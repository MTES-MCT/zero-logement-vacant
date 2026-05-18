-- int_zlovac_owner_housing.sql
-- Owner-housing relationship table for LOVAC 2026.
-- Reads from int_zlovac_owner_matching (CER->FF25 matching + rank logic),
-- joins int_zlovac_unique_owners on `dedup_key` to retrieve (fullname, address),
-- then computes owner_uid via the same zlovac_owner_uid macro used by
-- int_zlovac_owners. Two dedup_keys that collapse to the same owner_uid in
-- int_zlovac_owners will therefore produce the same owner_uid here.
-- Guarantees: every non-null owner_uid here exists in int_zlovac_owners.

WITH unique_owners_dedup AS (
    SELECT DISTINCT ON (dedup_key)
        dedup_key,
        owner_fullname,
        owner_address
    FROM {{ ref('int_zlovac_unique_owners') }}
    WHERE dedup_key IS NOT NULL
    ORDER BY dedup_key,
        owner_address NULLS LAST,
        owner_fullname NULLS LAST
),

owner_housing AS (
    SELECT
        {{ zlovac_owner_uid('uo.owner_fullname', 'uo.owner_address') }} AS owner_uid,
        m.ff_owner_idprodroit AS idprodroit,
        m.ff_owner_idpersonne AS idpersonne,
        m.local_id,
        m.ff_owner_property_rights AS property_rights,
        z.geo_code,
        z.ff_idprocpte AS idprocpte,
        m.rank,
        m.ff_owner_locprop AS locprop_source
    FROM {{ ref('int_zlovac_owner_matching') }} AS m
    LEFT JOIN {{ ref('int_zlovac') }} AS z
        ON z.local_id = m.local_id
    LEFT JOIN unique_owners_dedup AS uo
        ON uo.dedup_key = m.dedup_key
)

SELECT
    owner_uid,
    idprodroit,
    idpersonne,
    local_id,
    property_rights,
    geo_code,
    idprocpte,
    rank,
    locprop_source
FROM owner_housing
WHERE NOT (idpersonne IS NULL AND idprodroit IS NULL AND idprocpte IS NULL)
  AND owner_uid IS NOT NULL
