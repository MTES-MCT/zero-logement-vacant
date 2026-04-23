-- int_zlovac_owner_cer_matched.sql
-- Combines all matching phases into a single reference table.
-- One row per matched housing: local_id → matched_idpersonne.
--
-- Phase 1: LOVAC internal (CER = cer_nom_usage_1..6)
-- Phase 2: FF25 address (jaro_winkler >= 0.85)
-- Phase 3: Cascade (T0 unique name, T1 same CP, T2 same dept)

{{ config(materialized='view') }}

SELECT local_id, matched_idpersonne, match_source
FROM {{ ref('int_zlovac_owner_match_lovac') }}
UNION ALL
SELECT local_id, matched_idpersonne, match_source
FROM {{ ref('int_zlovac_owner_match_ff25') }}
UNION ALL
SELECT local_id, matched_idpersonne, match_source
FROM {{ ref('int_zlovac_owner_match_cascade') }}
