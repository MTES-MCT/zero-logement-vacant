-- Test: dgfip_address must not contain leading-zero number tokens
-- (e.g. "0004 RUE", "0105 AV") or collapsed double spaces.
-- Ensures the cleaning regex in int_zlovac.dgfip_address is effective.

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    dgfip_address,
    'dgfip_address not properly cleaned' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE dgfip_address IS NOT NULL
  AND (
        -- leading zero before a digit, anywhere
        REGEXP_MATCHES(dgfip_address, '(^|\s)0+\d')
        -- standalone zero token (e.g. "0 0 LE MANLE")
        OR REGEXP_MATCHES(dgfip_address, '\b0+\b')
        -- double spaces
        OR dgfip_address LIKE '%  %'
        -- leading/trailing whitespace
        OR dgfip_address <> TRIM(dgfip_address)
  )
