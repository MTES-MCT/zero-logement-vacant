-- int_zlovac_owner_match_lovac.sql
-- Phase 1: LOVAC internal matching.
-- Primary: cer_proprietaire (or cer_gestionnaire) = ff_ddenom_1..6 on the same row.
-- Fallback: cer_nom_usage_1..6 (kept for rows where ff_ddenom is empty).
-- Match yields the matching slot's idpersonne.

{{ config(materialized='table') }}

WITH lovac_internal AS (
    SELECT
        local_id,
        CASE
            -- Primary: cer_proprietaire vs ff_ddenom_N (same-row FF owners)
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_1_fullname, FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_2_fullname, FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_3_fullname, FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_4_fullname, FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_5_fullname, FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_proprietaire)) = ff_owner_6_fullname, FALSE) THEN ff_owner_6_idpersonne
            -- Primary: cer_gestionnaire vs ff_ddenom_N
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_1_fullname, FALSE) THEN ff_owner_1_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_2_fullname, FALSE) THEN ff_owner_2_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_3_fullname, FALSE) THEN ff_owner_3_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_4_fullname, FALSE) THEN ff_owner_4_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_5_fullname, FALSE) THEN ff_owner_5_idpersonne
            WHEN COALESCE(UPPER(TRIM(cer_gestionnaire)) = ff_owner_6_fullname, FALSE) THEN ff_owner_6_idpersonne
            -- Fallback: cer_nom_usage_N (legacy comparison, kept for rows where ff_ddenom is empty)
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
