-- int_zlovac_owner_housing.sql
-- Owner-housing relationship table for LOVAC 2026.
-- Reads from int_zlovac_owner_matching (CER->FF25 matching + rank logic),
-- then joins int_zlovac_owners on `dedup_key` to retrieve the canonical
-- owner_uid (one UUID per person, generated after dedup).
-- Guarantees: every non-null owner_uid here exists in int_zlovac_owners.

WITH owner_housing AS (
    SELECT
        o.owner_uid,
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
    LEFT JOIN {{ ref('int_zlovac_owners') }} AS o
        ON o.dedup_key = m.dedup_key
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
