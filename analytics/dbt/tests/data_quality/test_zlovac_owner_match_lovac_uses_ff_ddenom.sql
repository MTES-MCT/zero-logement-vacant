-- Regression: Phase 1 (LOVAC internal match) must compare cer_proprietaire
-- to ff_ddenom_1..6, not only to cer_nom_usage_1..6 (which is empty for
-- many rows). Previously, MD INVEST rows had empty cer_nom_usage_* so they
-- fell through to Phase 2 and failed.
--
-- Asserts: MD INVEST rows in int_zlovac get matched in Phase 1.

{{ config(severity='warn') }}

WITH md_invest_local_ids AS (
    SELECT local_id
    FROM {{ ref('int_zlovac') }}
    WHERE cer_proprietaire = 'MD INVEST'
)

SELECT
    'MD INVEST not matched in Phase 1' AS issue,
    COUNT(*) AS unmatched_count
FROM md_invest_local_ids m
LEFT JOIN {{ ref('int_zlovac_owner_match_lovac') }} p1 ON p1.local_id = m.local_id
WHERE p1.local_id IS NULL
HAVING COUNT(*) > 0
