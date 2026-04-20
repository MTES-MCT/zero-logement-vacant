-- int_zlovac_owner_housing.sql
-- Owner-housing relationship table for LOVAC 2026.
-- Reads from int_zlovac_owner_matching (CER->FF25 matching + rank logic).

WITH owner_housing AS (
    SELECT
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
)

SELECT * FROM owner_housing
