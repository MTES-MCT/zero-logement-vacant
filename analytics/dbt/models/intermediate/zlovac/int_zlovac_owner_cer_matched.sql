-- int_zlovac_owner_cer_matched.sql
-- Matches CER 1767 owners against FF25 to retrieve idpersonne.
-- Two-phase matching:
--   Phase 1: exact name + jaro_winkler on normalized address >= 0.85
--   Phase 2 (cascade): T0 unique name, T1 same postal code, T2 same department
-- Output: one row per housing with matched idpersonne (or NULL if no match).

{{ config(materialized='table') }}

WITH zlovac AS (
    SELECT
        local_id,
        cer_proprietaire,
        cer_gestionnaire,
        owner_adresse1,
        owner_adresse2,
        owner_adresse3,
        owner_adresse4,
        {{ normalize_address("CONCAT_WS(' ', NULLIF(TRIM(owner_adresse1), ''), NULLIF(TRIM(owner_adresse2), ''), NULLIF(TRIM(owner_adresse3), ''), NULLIF(TRIM(owner_adresse4), ''))") }} AS cer_address_norm,
        REGEXP_EXTRACT(owner_adresse4, '(\d{5})') AS lovac_cp,
        SUBSTRING(REGEXP_EXTRACT(owner_adresse4, '(\d{5})'), 1, 2) AS lovac_dept
    FROM {{ ref('int_zlovac') }}
),

-- ============================================================
-- Phase 1: Address matching (jaro_winkler >= 0.85)
-- ============================================================

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
    FROM zlovac z
    JOIN {{ ref('int_zlovac_ff25_lookup') }} f
        ON UPPER(TRIM(z.cer_proprietaire)) = f.owner_fullname_concat
    WHERE z.cer_proprietaire IS NOT NULL
        AND TRIM(z.cer_proprietaire) != ''
        AND jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) >= 0.85
),

best_match_proprio AS (
    SELECT local_id, matched_idpersonne, match_source, addr_score
    FROM match_proprio WHERE rn = 1
),

unmatched_proprio AS (
    SELECT z.*
    FROM zlovac z
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
    JOIN {{ ref('int_zlovac_ff25_lookup') }} f
        ON UPPER(TRIM(z.cer_gestionnaire)) = f.owner_fullname_concat
    WHERE z.cer_gestionnaire IS NOT NULL
        AND TRIM(z.cer_gestionnaire) != ''
        AND jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) >= 0.85
),

best_match_gestionnaire AS (
    SELECT local_id, matched_idpersonne, match_source, addr_score
    FROM match_gestionnaire WHERE rn = 1
),

address_matched AS (
    SELECT * FROM best_match_proprio
    UNION ALL
    SELECT * FROM best_match_gestionnaire
),

-- ============================================================
-- Phase 2: Cascade matching for address-unmatched rows
-- ============================================================

unmatched_address AS (
    SELECT
        z.local_id,
        UPPER(TRIM(COALESCE(
            NULLIF(TRIM(z.cer_proprietaire), ''),
            NULLIF(TRIM(z.cer_gestionnaire), '')
        ))) AS cer_name,
        z.lovac_cp,
        z.lovac_dept
    FROM zlovac z
    LEFT JOIN address_matched am ON z.local_id = am.local_id
    WHERE am.local_id IS NULL
      AND COALESCE(NULLIF(TRIM(z.cer_proprietaire), ''), NULLIF(TRIM(z.cer_gestionnaire), '')) IS NOT NULL
),

-- T0: Name is unique in FF25
cascade_t0 AS (
    SELECT
        u.local_id,
        ns.unique_idpersonne AS matched_idpersonne,
        'cascade_t0_unique_name' AS match_source,
        NULL::DOUBLE AS addr_score
    FROM unmatched_address u
    JOIN {{ ref('stg_ff_owners_name_stats_2025') }} ns
        ON u.cer_name = ns.owner_fullname_concat
        AND ns.nb_idpersonne = 1
),

-- T1/T2: non-unique names, disambiguate by geography
unmatched_t0 AS (
    SELECT u.*
    FROM unmatched_address u
    LEFT JOIN cascade_t0 t0 ON u.local_id = t0.local_id
    WHERE t0.local_id IS NULL
),

cascade_geo AS (
    SELECT
        u.local_id,
        f.idpersonne AS matched_idpersonne,
        CASE
            WHEN u.lovac_cp = f.owner_cp THEN 'cascade_t1_same_cp'
            WHEN u.lovac_dept = f.owner_dept THEN 'cascade_t2_same_dept'
        END AS match_source,
        NULL::DOUBLE AS addr_score,
        ROW_NUMBER() OVER (PARTITION BY u.local_id ORDER BY
            CASE WHEN u.lovac_cp = f.owner_cp THEN 1 ELSE 2 END
        ) AS rn
    FROM unmatched_t0 u
    JOIN {{ ref('int_zlovac_ff25_lookup') }} f
        ON u.cer_name = f.owner_fullname_concat
        AND (u.lovac_cp = f.owner_cp OR u.lovac_dept = f.owner_dept)
    WHERE u.lovac_cp IS NOT NULL
),

best_cascade_geo AS (
    SELECT local_id, matched_idpersonne, match_source, addr_score
    FROM cascade_geo WHERE rn = 1
)

-- Final output: one row per housing
SELECT local_id, matched_idpersonne, match_source, addr_score
FROM address_matched
UNION ALL
SELECT local_id, matched_idpersonne, match_source, addr_score
FROM cascade_t0
UNION ALL
SELECT local_id, matched_idpersonne, match_source, addr_score
FROM best_cascade_geo
