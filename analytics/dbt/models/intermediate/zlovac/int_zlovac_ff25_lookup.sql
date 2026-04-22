-- int_zlovac_ff25_lookup.sql
-- Pre-filters FF25 owners to only names present in LOVAC CER fields.
-- Reduces FF25 from 45M to ~5-10M rows for efficient matching.
-- Also pre-normalizes addresses for jaro_winkler comparison.

{{ config(materialized='table') }}

WITH lovac_names AS (
    SELECT DISTINCT UPPER(TRIM(name)) AS cer_name
    FROM (
        SELECT cer_proprietaire AS name FROM {{ ref('int_zlovac') }}
        WHERE cer_proprietaire IS NOT NULL AND TRIM(cer_proprietaire) != ''
        UNION
        SELECT cer_gestionnaire AS name FROM {{ ref('int_zlovac') }}
        WHERE cer_gestionnaire IS NOT NULL AND TRIM(cer_gestionnaire) != ''
    )
)

SELECT
    f.idpersonne,
    f.owner_fullname_concat,
    f.owner_full_address,
    f.owner_cp,
    f.owner_dept,
    {{ normalize_address("f.owner_full_address") }} AS ff25_address_norm
FROM {{ ref('stg_ff_owners_idperson_2025') }} f
INNER JOIN lovac_names ln ON f.owner_fullname_concat = ln.cer_name
WHERE f.owner_full_address IS NOT NULL AND TRIM(f.owner_full_address) != ''
