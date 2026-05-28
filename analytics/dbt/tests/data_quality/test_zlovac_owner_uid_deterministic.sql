-- Determinism guard: two rows with identical (UPPER(TRIM(fullname)),
-- normalized address) must produce the same owner_uid. If the UUID
-- generation drifts (e.g. someone replaces zlovac_owner_uid with uuid()),
-- this catches it.

{{ config(severity='error') }}

SELECT
    UPPER(TRIM(owner_fullname)) AS fullname_norm,
    {{ normalize_address('owner_address') }} AS address_norm,
    COUNT(DISTINCT owner_uid) AS uid_count
FROM {{ ref('int_zlovac_owners') }}
WHERE owner_fullname IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(DISTINCT owner_uid) > 1
