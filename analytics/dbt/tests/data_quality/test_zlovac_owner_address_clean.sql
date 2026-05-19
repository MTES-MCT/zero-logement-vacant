-- Test: int_zlovac_owners.owner_address has no leading-zero tokens,
-- no isolated zero tokens, no double spaces, and is trimmed.

{{ config(severity='error', error_if='>0') }}

SELECT
    owner_uid,
    owner_address,
    'owner_address not properly cleaned' as issue
FROM {{ ref('int_zlovac_owners') }}
WHERE owner_address IS NOT NULL
  AND (
        REGEXP_MATCHES(owner_address, '(^|\s)0+\d')
        OR REGEXP_MATCHES(owner_address, '\b0+\b')
        OR owner_address LIKE '%  %'
        OR owner_address <> TRIM(owner_address)
  )
