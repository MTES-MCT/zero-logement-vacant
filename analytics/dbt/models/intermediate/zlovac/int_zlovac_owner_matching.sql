-- int_zlovac_owner_matching.sql
-- Applies rank logic based on CER→FF25 matching results.
-- Reads from int_zlovac_owner_cer_matched (the matching) and int_zlovac (FF owners 1..6).
--
-- Generates a deterministic owner_uid (MD5) for each owner row to allow
-- joining owners ↔ owner_housing without relying on idpersonne/idprodroit.
--
-- Three outcome cases:
--   1. Match + found in LOVAC 6: CER=rank 1, remove dup, rest keep order
--   2. Match + not found in 6:   CER=rank 1 (with idpersonne), FF owners=rank -1
--   3. No match:                 CER=rank 1 (no idpersonne), FF owners=rank -1

{{ config(materialized='table') }}

WITH zlovac AS (
    SELECT
        local_id,
        owner_fullname,
        ff_owner_1_idpersonne, ff_owner_2_idpersonne, ff_owner_3_idpersonne,
        ff_owner_4_idpersonne, ff_owner_5_idpersonne, ff_owner_6_idpersonne,
        ff_owner_1_fullname, ff_owner_2_fullname, ff_owner_3_fullname,
        ff_owner_4_fullname, ff_owner_5_fullname, ff_owner_6_fullname,
        ff_owner_1_idprodroit, ff_owner_2_idprodroit, ff_owner_3_idprodroit,
        ff_owner_4_idprodroit, ff_owner_5_idprodroit, ff_owner_6_idprodroit,
        ff_owner_1_locprop, ff_owner_2_locprop, ff_owner_3_locprop,
        ff_owner_4_locprop, ff_owner_5_locprop, ff_owner_6_locprop,
        ff_owner_1_property_rights, ff_owner_2_property_rights, ff_owner_3_property_rights,
        ff_owner_4_property_rights, ff_owner_5_property_rights, ff_owner_6_property_rights
    FROM {{ ref('int_zlovac') }}
),

-- Detect if matched idpersonne is among FF owners 1..6
match_with_dup_detection AS (
    SELECT
        z.local_id,
        z.owner_fullname,
        m.matched_idpersonne,
        m.match_source,
        CASE
            WHEN m.matched_idpersonne = z.ff_owner_1_idpersonne THEN 1
            WHEN m.matched_idpersonne = z.ff_owner_2_idpersonne THEN 2
            WHEN m.matched_idpersonne = z.ff_owner_3_idpersonne THEN 3
            WHEN m.matched_idpersonne = z.ff_owner_4_idpersonne THEN 4
            WHEN m.matched_idpersonne = z.ff_owner_5_idpersonne THEN 5
            WHEN m.matched_idpersonne = z.ff_owner_6_idpersonne THEN 6
            ELSE NULL
        END AS matched_slot
    FROM zlovac z
    LEFT JOIN {{ ref('int_zlovac_owner_cer_matched') }} m ON z.local_id = m.local_id
),

-- Unpivot: CER 1767 owner (rank 1) + FF owners 1..6
unpivoted AS (
    -- CER 1767 owner (always rank 1)
    SELECT
        d.local_id,
        d.matched_idpersonne AS ff_owner_idpersonne,
        NULL AS ff_owner_idprodroit,
        NULL AS ff_owner_locprop,
        NULL AS ff_owner_property_rights,
        d.owner_fullname AS ff_owner_fullname,
        1 AS rank,
        d.match_source
    FROM match_with_dup_detection d

    UNION ALL

    -- FF owner 1
    SELECT z.local_id, z.ff_owner_1_idpersonne, z.ff_owner_1_idprodroit, z.ff_owner_1_locprop, z.ff_owner_1_property_rights,
        z.ff_owner_1_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 1 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN 2
            ELSE -1
        END AS rank,
        NULL AS match_source
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_1_fullname IS NOT NULL

    UNION ALL

    -- FF owner 2
    SELECT z.local_id, z.ff_owner_2_idpersonne, z.ff_owner_2_idprodroit, z.ff_owner_2_locprop, z.ff_owner_2_property_rights,
        z.ff_owner_2_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 2 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 2 THEN 2 ELSE 3 END
            ELSE -1
        END AS rank,
        NULL
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_2_fullname IS NOT NULL

    UNION ALL

    -- FF owner 3
    SELECT z.local_id, z.ff_owner_3_idpersonne, z.ff_owner_3_idprodroit, z.ff_owner_3_locprop, z.ff_owner_3_property_rights,
        z.ff_owner_3_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 3 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 3 THEN 3 ELSE 4 END
            ELSE -1
        END AS rank,
        NULL
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_3_fullname IS NOT NULL

    UNION ALL

    -- FF owner 4
    SELECT z.local_id, z.ff_owner_4_idpersonne, z.ff_owner_4_idprodroit, z.ff_owner_4_locprop, z.ff_owner_4_property_rights,
        z.ff_owner_4_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 4 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 4 THEN 4 ELSE 5 END
            ELSE -1
        END AS rank,
        NULL
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_4_fullname IS NOT NULL

    UNION ALL

    -- FF owner 5
    SELECT z.local_id, z.ff_owner_5_idpersonne, z.ff_owner_5_idprodroit, z.ff_owner_5_locprop, z.ff_owner_5_property_rights,
        z.ff_owner_5_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 5 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 5 THEN 5 ELSE 6 END
            ELSE -1
        END AS rank,
        NULL
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_5_fullname IS NOT NULL

    UNION ALL

    -- FF owner 6
    SELECT z.local_id, z.ff_owner_6_idpersonne, z.ff_owner_6_idprodroit, z.ff_owner_6_locprop, z.ff_owner_6_property_rights,
        z.ff_owner_6_fullname,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 6 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN 6
            ELSE -1
        END AS rank,
        NULL
    FROM zlovac z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_6_fullname IS NOT NULL
)

SELECT
    local_id,
    ff_owner_idpersonne,
    ff_owner_idprodroit,
    ff_owner_locprop,
    ff_owner_property_rights,
    ff_owner_fullname,
    rank,
    match_source,
    uuid() AS owner_uid
FROM unpivoted
WHERE rank IS NOT NULL
