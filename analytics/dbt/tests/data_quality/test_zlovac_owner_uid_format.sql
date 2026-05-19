-- Format check: owner_uid must be a valid v5 UUID string.
-- Version nibble at position 15 (the '5'), variant nibble at position 20 (the '8').
-- Regex matches the 8-4-4-4-12 hex layout.

{{ config(severity='error') }}

SELECT
    owner_uid,
    CAST(owner_uid AS VARCHAR) AS uid_str
FROM {{ ref('int_zlovac_owners') }}
WHERE NOT REGEXP_MATCHES(
    CAST(owner_uid AS VARCHAR),
    '^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$'
)
