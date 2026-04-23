-- int_zlovac_owner_match_lovac.sql
-- Phase 1: LOVAC internal matching.
-- CER name (proprio/gestionnaire) = cer_nom_usage_1..6 → take idpersonne from that slot.
-- Expected: ~818k matches.

{{ config(materialized='table') }}

WITH lovac_internal AS (
    SELECT
        local_id,
        CASE
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_1_username, '_', ' ')), FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_2_username, '_', ' ')), FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_3_username, '_', ' ')), FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_4_username, '_', ' ')), FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_5_username, '_', ' ')), FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = UPPER(REPLACE(ff_owner_6_username, '_', ' ')), FALSE) THEN ff_owner_6_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_1_username, '_', ' ')), FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_2_username, '_', ' ')), FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_3_username, '_', ' ')), FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_4_username, '_', ' ')), FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_5_username, '_', ' ')), FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = UPPER(REPLACE(ff_owner_6_username, '_', ' ')), FALSE) THEN ff_owner_6_idpersonne
            ELSE NULL
        END AS matched_idpersonne
    FROM {{ ref('int_zlovac') }}
)

SELECT
    local_id,
    matched_idpersonne,
    'lovac_internal' AS match_source
FROM lovac_internal
WHERE matched_idpersonne IS NOT NULL
