-- Regression: MD INVEST (SIREN 899968838) is one legal entity carried under
-- multiple FF idpersonnes (44PBH8N9 for Loire-Atlantique, 85PBFGSL for Vendée).
-- With deterministic UUID v5 keyed on (fullname, address) and Phase 1 matching
-- cer_proprietaire to ff_ddenom_* on the same row, all MD INVEST rows must
-- collapse to exactly one owner_uid.

{{ config(severity='warn') }}

SELECT
    owner_fullname,
    COUNT(DISTINCT owner_uid) AS uid_count
FROM {{ ref('int_zlovac_owners') }}
WHERE owner_fullname = 'MD INVEST'
GROUP BY owner_fullname
HAVING COUNT(DISTINCT owner_uid) > 1
