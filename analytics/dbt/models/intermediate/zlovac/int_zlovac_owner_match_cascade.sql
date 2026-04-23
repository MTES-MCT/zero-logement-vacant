-- int_zlovac_owner_match_cascade.sql
-- Phase 3: Cascade matching for rows NOT matched in Phase 1 or 2.
-- T0: name unique in FF25 → direct match
-- T1: same postal code
-- T2: same department

{{ config(materialized='table') }}

WITH unmatched AS (
    SELECT
        z.local_id,
        UPPER(TRIM(COALESCE(
            NULLIF(TRIM(z.cer_proprietaire), ''),
            NULLIF(TRIM(z.cer_gestionnaire), '')
        ))) AS cer_name,
        REGEXP_EXTRACT(z.owner_adresse4, '(\d{5})') AS lovac_cp,
        SUBSTRING(REGEXP_EXTRACT(z.owner_adresse4, '(\d{5})'), 1, 2) AS lovac_dept
    FROM {{ ref('int_zlovac') }} z
    LEFT JOIN {{ ref('int_zlovac_owner_match_lovac') }} p1 ON z.local_id = p1.local_id
    LEFT JOIN {{ ref('int_zlovac_owner_match_ff25') }} p2 ON z.local_id = p2.local_id
    WHERE p1.local_id IS NULL
      AND p2.local_id IS NULL
      AND COALESCE(NULLIF(TRIM(z.cer_proprietaire), ''), NULLIF(TRIM(z.cer_gestionnaire), '')) IS NOT NULL
),

-- T0: Name is unique in FF25
cascade_t0 AS (
    SELECT
        u.local_id,
        ns.unique_idpersonne AS matched_idpersonne,
        'cascade_t0_unique_name' AS match_source
    FROM unmatched u
    JOIN {{ ref('stg_ff_owners_name_stats_2025') }} ns
        ON u.cer_name = ns.owner_fullname_concat
        AND ns.nb_idpersonne = 1
),

-- T1/T2: non-unique names, disambiguate by geography
unmatched_t0 AS (
    SELECT u.*
    FROM unmatched u
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
    SELECT local_id, matched_idpersonne, match_source
    FROM cascade_geo WHERE rn = 1
)

SELECT * FROM cascade_t0
UNION ALL
SELECT * FROM best_cascade_geo
