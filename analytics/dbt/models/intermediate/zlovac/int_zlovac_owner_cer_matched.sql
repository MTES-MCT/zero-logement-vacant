-- int_zlovac_owner_cer_matched.sql
-- Matches CER 1767 owners to retrieve idpersonne.
--
-- Three-phase matching:
--   Phase 1 (LOVAC internal): CER name = cer_nom_usage_1..6 → take idpersonne from that slot
--   Phase 2 (FF25 address): exact name + jaro_winkler on normalized address >= 0.85
--   Phase 3 (Cascade): T0 unique name, T1 same postal code, T2 same department
--
-- Each phase only processes rows not matched by previous phases.
-- Output: one row per matched housing with local_id, matched_idpersonne, match_source.

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
        ff_owner_1_idpersonne, ff_owner_2_idpersonne, ff_owner_3_idpersonne,
        ff_owner_4_idpersonne, ff_owner_5_idpersonne, ff_owner_6_idpersonne,
        ff_owner_1_username, ff_owner_2_username, ff_owner_3_username,
        ff_owner_4_username, ff_owner_5_username, ff_owner_6_username,
        {{ normalize_address("CONCAT_WS(' ', NULLIF(TRIM(owner_adresse1), ''), NULLIF(TRIM(owner_adresse2), ''), NULLIF(TRIM(owner_adresse3), ''), NULLIF(TRIM(owner_adresse4), ''))") }} AS cer_address_norm,
        REGEXP_EXTRACT(owner_adresse4, '(\d{5})') AS lovac_cp,
        SUBSTRING(REGEXP_EXTRACT(owner_adresse4, '(\d{5})'), 1, 2) AS lovac_dept
    FROM {{ ref('int_zlovac') }}
),

-- ============================================================
-- Phase 1: LOVAC internal matching
-- CER name (proprio or gestionnaire) = cer_nom_usage_1..6
-- The cer_nom_usage fields use underscores: M_DUPONT_JEAN → replace with spaces
-- ============================================================

lovac_internal AS (
    SELECT
        local_id,
        CASE
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_1_username, '_', ' ')), FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_2_username, '_', ' ')), FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_3_username, '_', ' ')), FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_4_username, '_', ' ')), FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_5_username, '_', ' ')), FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_6_username, '_', ' ')), FALSE) THEN ff_owner_6_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_1_username, '_', ' ')), FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_2_username, '_', ' ')), FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_3_username, '_', ' ')), FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_4_username, '_', ' ')), FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_5_username, '_', ' ')), FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_6_username, '_', ' ')), FALSE) THEN ff_owner_6_idpersonne
            ELSE NULL
        END AS matched_idpersonne
    FROM zlovac
),

phase1_matched AS (
    SELECT
        local_id,
        matched_idpersonne,
        'lovac_internal' AS match_source,
        NULL::DOUBLE AS addr_score
    FROM lovac_internal
    WHERE matched_idpersonne IS NOT NULL
),

-- ============================================================
-- Phase 2: FF25 address matching (jaro_winkler >= 0.85)
-- Only for rows NOT matched in Phase 1
-- ============================================================

unmatched_phase1 AS (
    SELECT z.*
    FROM zlovac z
    LEFT JOIN phase1_matched p1 ON z.local_id = p1.local_id
    WHERE p1.local_id IS NULL
),

match_proprio AS (
    SELECT
        z.local_id,
        f.idpersonne AS matched_idpersonne,
        'ff25_address_proprio' AS match_source,
        jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) AS addr_score,
        ROW_NUMBER() OVER (
            PARTITION BY z.local_id
            ORDER BY jaro_winkler_similarity(z.cer_address_norm, f.ff25_address_norm) DESC
        ) AS rn
    FROM unmatched_phase1 z
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
    FROM unmatched_phase1 z
    LEFT JOIN best_match_proprio p ON z.local_id = p.local_id
    WHERE p.local_id IS NULL
),

match_gestionnaire AS (
    SELECT
        z.local_id,
        f.idpersonne AS matched_idpersonne,
        'ff25_address_gestionnaire' AS match_source,
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

phase2_matched AS (
    SELECT * FROM best_match_proprio
    UNION ALL
    SELECT * FROM best_match_gestionnaire
),

-- ============================================================
-- Phase 3: Cascade matching for Phase 1+2 unmatched rows
-- ============================================================

unmatched_phase2 AS (
    SELECT
        z.local_id,
        UPPER(TRIM(COALESCE(
            NULLIF(TRIM(z.cer_proprietaire), ''),
            NULLIF(TRIM(z.cer_gestionnaire), '')
        ))) AS cer_name,
        z.lovac_cp,
        z.lovac_dept
    FROM unmatched_phase1 z
    LEFT JOIN phase2_matched p2 ON z.local_id = p2.local_id
    WHERE p2.local_id IS NULL
      AND COALESCE(NULLIF(TRIM(z.cer_proprietaire), ''), NULLIF(TRIM(z.cer_gestionnaire), '')) IS NOT NULL
),

-- T0: Name is unique in FF25
cascade_t0 AS (
    SELECT
        u.local_id,
        ns.unique_idpersonne AS matched_idpersonne,
        'cascade_t0_unique_name' AS match_source,
        NULL::DOUBLE AS addr_score
    FROM unmatched_phase2 u
    JOIN {{ ref('stg_ff_owners_name_stats_2025') }} ns
        ON u.cer_name = ns.owner_fullname_concat
        AND ns.nb_idpersonne = 1
),

-- T1/T2: non-unique names, disambiguate by geography
unmatched_t0 AS (
    SELECT u.*
    FROM unmatched_phase2 u
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

-- Final output: all matched rows from all 3 phases
SELECT * FROM phase1_matched
UNION ALL
SELECT * FROM phase2_matched
UNION ALL
SELECT * FROM cascade_t0
UNION ALL
SELECT * FROM best_cascade_geo
