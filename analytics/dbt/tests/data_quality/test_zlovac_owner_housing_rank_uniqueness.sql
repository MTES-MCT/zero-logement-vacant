-- Test: per local_id, rank>=1 must be unique (no two owners share the same rank).
-- rank=-1 sentinel can repeat per slot (housing with no FF owner emits one row per
-- empty owner slot), so it is excluded from the uniqueness check.

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    rank,
    COUNT(*) as n,
    'duplicate (local_id, rank) pair for rank >= 1' as issue
FROM {{ ref('int_zlovac_owner_housing') }}
WHERE rank >= 1
GROUP BY local_id, rank
HAVING COUNT(*) > 1
