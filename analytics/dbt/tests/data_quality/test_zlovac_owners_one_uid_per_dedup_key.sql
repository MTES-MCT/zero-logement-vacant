-- Test: int_zlovac_owners must produce exactly one owner_uid per dedup_key.
-- Complements the unique/not_null tests at column level: this asserts the
-- relationship across both columns directly.

{{ config(severity='error') }}

SELECT
    dedup_key,
    COUNT(DISTINCT owner_uid) AS uid_count
FROM {{ ref('int_zlovac_owners') }}
GROUP BY dedup_key
HAVING COUNT(DISTINCT owner_uid) <> 1
