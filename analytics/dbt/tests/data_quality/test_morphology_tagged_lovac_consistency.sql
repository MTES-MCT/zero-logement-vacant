-- Test: le compteur du parc ZLV importé par millésime doit coïncider, sur 2026,
-- avec le compteur historique figé sur lovac-2026.
--
-- Les deux colonnes mesurent la même chose pour ce millésime. Elles divergeront
-- au moment où un millésime 2027 sera ajouté sans que
-- count_housing_last_lovac_production ne soit repointé — c'est précisément ce que
-- ce test doit attraper, count_housing_last_lovac_production étant un compteur en
-- dur.
--
-- Voir docs/decisions/20260805142324-millesime-inclus-provenance-d-import-et-non-presence-lovac.md

{{ config(severity='error', error_if='>0') }}

SELECT
    year
    , geo_code
    , count_housing_last_lovac_production
    , count_housing_tagged_lovac_production
    , 'compteur par millésime différent du compteur historique lovac-2026'
        AS issue
FROM {{ ref('marts_common_morphology') }}
WHERE
    year = 2026
    AND COALESCE(count_housing_last_lovac_production, 0)
    != COALESCE(count_housing_tagged_lovac_production, 0)
