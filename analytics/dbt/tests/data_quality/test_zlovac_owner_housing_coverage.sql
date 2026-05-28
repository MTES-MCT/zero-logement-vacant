-- Test: every housing in int_zlovac_housing must appear in int_zlovac_owner_housing
-- (either with rank>=1 if FF owners exist, or rank=-1 sentinel if none).
-- Catches join/filter regressions that silently drop housing from the owner mapping.

{{ config(severity='warn', warn_if='>0', error_if='>1000') }}

SELECT
    h.local_id,
    'housing missing from int_zlovac_owner_housing' as issue
FROM {{ ref('int_zlovac_housing') }} h
LEFT JOIN (
    SELECT DISTINCT local_id FROM {{ ref('int_zlovac_owner_housing') }}
) oh USING (local_id)
WHERE oh.local_id IS NULL
