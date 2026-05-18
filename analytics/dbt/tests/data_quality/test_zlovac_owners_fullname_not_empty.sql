-- Test: owner_fullname must be non-empty.
-- int_zlovac_unique_owners filters WHERE ff_owner_N_fullname IS NOT NULL
-- so empty strings or whitespace-only would indicate upstream pollution.

{{ config(severity='error', error_if='>0') }}

SELECT
    owner_uid,
    owner_fullname,
    'owner_fullname empty or whitespace-only' as issue
FROM {{ ref('int_zlovac_owners') }}
WHERE owner_fullname IS NULL OR TRIM(owner_fullname) = ''
