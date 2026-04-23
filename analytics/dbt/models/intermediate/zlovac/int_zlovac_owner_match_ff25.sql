-- int_zlovac_owner_match_ff25.sql
-- Phase 2: FF25 address matching for rows NOT matched in Phase 1 (LOVAC internal).
-- Exact name + jaro_winkler on normalized address >= 0.85.
-- Try cer_proprietaire first, fallback to cer_gestionnaire.

{{ config(materialized='table') }}

WITH unmatched_phase1 AS (
    SELECT
        z.local_id,
        z.cer_proprietaire,
        z.cer_gestionnaire,
        {{ normalize_address("CONCAT_WS(' ', NULLIF(TRIM(z.owner_adresse1), ''), NULLIF(TRIM(z.owner_adresse2), ''), NULLIF(TRIM(z.owner_adresse3), ''), NULLIF(TRIM(z.owner_adresse4), ''))") }} AS cer_address_norm
    FROM {{ ref('int_zlovac') }} z
    LEFT JOIN {{ ref('int_zlovac_owner_match_lovac') }} p1 ON z.local_id = p1.local_id
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
    SELECT local_id, matched_idpersonne, match_source
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
    SELECT local_id, matched_idpersonne, match_source
    FROM match_gestionnaire WHERE rn = 1
)

SELECT * FROM best_match_proprio
UNION ALL
SELECT * FROM best_match_gestionnaire
