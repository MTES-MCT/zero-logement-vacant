-- int_zlovac_owner_matching.sql
-- Matches CER 1767 owners (proprietaire/gestionnaire) against FF25 owner table
-- to retrieve idpersonne, then applies rank logic for owner-housing relationships.
--
-- Matching: exact name + jaro_winkler_similarity on normalized address >= 0.9
-- Fallback: cer_proprietaire first, then cer_gestionnaire
--
-- Three outcome cases:
--   1. Match + found in LOVAC 6: CER=rank 1, remove dup, rest keep order
--   2. Match + not found in 6:   CER=rank 1 (with idpersonne), FF owners=rank -1
--   3. No match:                 CER=rank 1 (no idpersonne), FF owners=rank -1

WITH zlovac AS (
    SELECT
        local_id,
        cer_proprietaire,
        cer_gestionnaire,
        owner_fullname,
        owner_raw_address,
        owner_postal_code,
        owner_city,
        owner_adresse1,
        owner_adresse2,
        owner_adresse3,
        owner_adresse4,
        administrator,
        owner_kind,
        mutation_date,
        ff_owner_1_idpersonne,
        ff_owner_2_idpersonne,
        ff_owner_3_idpersonne,
        ff_owner_4_idpersonne,
        ff_owner_5_idpersonne,
        ff_owner_6_idpersonne
    FROM {{ ref('int_zlovac') }}
),

cer_normalized AS (
    SELECT
        *,
        REGEXP_REPLACE(
            UPPER(TRIM(CONCAT_WS(' ',
                NULLIF(TRIM(owner_adresse1), ''),
                NULLIF(TRIM(owner_adresse2), ''),
                NULLIF(TRIM(owner_adresse3), ''),
                NULLIF(TRIM(owner_adresse4), '')
            ))),
            '(^|\s)0+(\d)', '\1\2', 'g'
        ) AS cer_address_norm
    FROM zlovac
),

ff25 AS (
    SELECT
        idpersonne,
        owner_fullname_concat,
        REGEXP_REPLACE(owner_full_address, '(^|\s)0+(\d)', '\1\2', 'g') AS ff25_address_norm
    FROM {{ ref('stg_ff_owners_idperson_2025') }}
    WHERE owner_full_address IS NOT NULL AND TRIM(owner_full_address) != ''
),

-- Step 1: Match on cer_proprietaire
match_proprio AS (
    SELECT
        z.local_id,
        f.idpersonne AS matched_idpersonne,
        'proprietaire' AS match_source,
        jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) AS addr_score,
        ROW_NUMBER() OVER (
            PARTITION BY z.local_id
            ORDER BY jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) DESC
        ) AS rn
    FROM cer_normalized z
    JOIN ff25 f
        ON UPPER(TRIM(z.cer_proprietaire)) = f.owner_fullname_concat
    WHERE z.cer_proprietaire IS NOT NULL
        AND TRIM(z.cer_proprietaire) != ''
        AND jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) >= 0.9
),

best_match_proprio AS (
    SELECT local_id, matched_idpersonne, match_source, addr_score
    FROM match_proprio
    WHERE rn = 1
),

-- Step 2: Fallback to cer_gestionnaire for unmatched
unmatched_proprio AS (
    SELECT z.*
    FROM cer_normalized z
    LEFT JOIN best_match_proprio p ON z.local_id = p.local_id
    WHERE p.local_id IS NULL
),

match_gestionnaire AS (
    SELECT
        z.local_id,
        f.idpersonne AS matched_idpersonne,
        'gestionnaire' AS match_source,
        jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) AS addr_score,
        ROW_NUMBER() OVER (
            PARTITION BY z.local_id
            ORDER BY jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) DESC
        ) AS rn
    FROM unmatched_proprio z
    JOIN ff25 f
        ON UPPER(TRIM(z.cer_gestionnaire)) = f.owner_fullname_concat
    WHERE z.cer_gestionnaire IS NOT NULL
        AND TRIM(z.cer_gestionnaire) != ''
        AND jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) >= 0.9
),

best_match_gestionnaire AS (
    SELECT local_id, matched_idpersonne, match_source, addr_score
    FROM match_gestionnaire
    WHERE rn = 1
),

-- Step 3: Combine matches
cer_matched AS (
    SELECT * FROM best_match_proprio
    UNION ALL
    SELECT * FROM best_match_gestionnaire
),

-- Step 4: Detect if matched idpersonne is among FF owners 1..6
match_with_dup_detection AS (
    SELECT
        z.local_id,
        m.matched_idpersonne,
        m.match_source,
        m.addr_score,
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
    LEFT JOIN cer_matched m ON z.local_id = m.local_id
),

-- Step 5: Unpivot FF owners 1..6 + CER 1767 owner
unpivoted AS (
    -- CER 1767 owner (always rank 1)
    SELECT
        d.local_id,
        d.matched_idpersonne AS ff_owner_idpersonne,
        NULL AS ff_owner_idprodroit,
        NULL AS ff_owner_locprop,
        NULL AS ff_owner_property_rights,
        1 AS rank,
        d.match_source
    FROM match_with_dup_detection d

    UNION ALL

    -- FF owner 1
    SELECT z.local_id, z.ff_owner_1_idpersonne, z.ff_owner_1_idprodroit, z.ff_owner_1_locprop, z.ff_owner_1_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 1 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN 2
            ELSE -1
        END AS rank,
        NULL AS match_source
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_1_fullname IS NOT NULL

    UNION ALL

    -- FF owner 2
    SELECT z.local_id, z.ff_owner_2_idpersonne, z.ff_owner_2_idprodroit, z.ff_owner_2_locprop, z.ff_owner_2_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 2 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 2 THEN 2 ELSE 3 END
            ELSE -1
        END AS rank,
        NULL
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_2_fullname IS NOT NULL

    UNION ALL

    -- FF owner 3
    SELECT z.local_id, z.ff_owner_3_idpersonne, z.ff_owner_3_idprodroit, z.ff_owner_3_locprop, z.ff_owner_3_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 3 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 3 THEN 3 ELSE 4 END
            ELSE -1
        END AS rank,
        NULL
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_3_fullname IS NOT NULL

    UNION ALL

    -- FF owner 4
    SELECT z.local_id, z.ff_owner_4_idpersonne, z.ff_owner_4_idprodroit, z.ff_owner_4_locprop, z.ff_owner_4_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 4 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 4 THEN 4 ELSE 5 END
            ELSE -1
        END AS rank,
        NULL
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_4_fullname IS NOT NULL

    UNION ALL

    -- FF owner 5
    SELECT z.local_id, z.ff_owner_5_idpersonne, z.ff_owner_5_idprodroit, z.ff_owner_5_locprop, z.ff_owner_5_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 5 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN
                CASE WHEN d.matched_slot < 5 THEN 5 ELSE 6 END
            ELSE -1
        END AS rank,
        NULL
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_5_fullname IS NOT NULL

    UNION ALL

    -- FF owner 6
    SELECT z.local_id, z.ff_owner_6_idpersonne, z.ff_owner_6_idprodroit, z.ff_owner_6_locprop, z.ff_owner_6_property_rights,
        CASE
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot = 6 THEN NULL
            WHEN d.matched_idpersonne IS NOT NULL AND d.matched_slot IS NOT NULL THEN 6
            ELSE -1
        END AS rank,
        NULL
    FROM {{ ref('int_zlovac') }} z
    JOIN match_with_dup_detection d ON z.local_id = d.local_id
    WHERE z.ff_owner_6_fullname IS NOT NULL
)

SELECT
    local_id,
    ff_owner_idpersonne,
    ff_owner_idprodroit,
    ff_owner_locprop,
    ff_owner_property_rights,
    rank,
    match_source
FROM unpivoted
WHERE rank IS NOT NULL
