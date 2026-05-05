-- Test: every row in int_zlovac_owner_housing must reference an existing owner_uid
-- in int_zlovac_owners. Catches regression of the 588k-orphan bug caused by
-- generating owner_uid via uuid() per row in int_zlovac_owner_matching.

{{ config(severity='error') }}

SELECT
    oh.owner_uid,
    oh.idpersonne,
    oh.local_id,
    'orphan owner_uid: not found in int_zlovac_owners' AS issue
FROM {{ ref('int_zlovac_owner_housing') }} AS oh
LEFT JOIN {{ ref('int_zlovac_owners') }} AS o
    ON o.owner_uid = oh.owner_uid
WHERE o.owner_uid IS NULL
