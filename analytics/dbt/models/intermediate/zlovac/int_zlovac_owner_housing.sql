-- int_zlovac_owner_housing.sql
-- Owner-housing relationship table for LOVAC 2026.
-- Reads from int_zlovac_owner_matching (CER->FF25 matching + rank logic) and
-- joins int_zlovac_dedup_key_uid on `dedup_key` to retrieve owner_uid.
--
-- CRITICAL: owner_uid is NEVER recomputed here. It comes from the same
-- canonical mapping (int_zlovac_dedup_key_uid) that feeds int_zlovac_owners,
-- so every owner_uid emitted here is guaranteed to exist in int_zlovac_owners.

SELECT
    d.owner_uid,
    m.ff_owner_idprodroit AS idprodroit,
    m.ff_owner_idpersonne AS idpersonne,
    m.local_id,
    m.ff_owner_property_rights AS property_rights,
    z.geo_code,
    z.ff_idprocpte AS idprocpte,
    m.rank,
    m.ff_owner_locprop AS locprop_source
FROM {{ ref('int_zlovac_owner_matching') }} AS m
INNER JOIN {{ ref('int_zlovac_dedup_key_uid') }} AS d ON d.dedup_key = m.dedup_key
LEFT JOIN {{ ref('int_zlovac') }} AS z ON z.local_id = m.local_id
WHERE NOT (
    m.ff_owner_idpersonne IS NULL
    AND m.ff_owner_idprodroit IS NULL
    AND z.ff_idprocpte IS NULL
)
