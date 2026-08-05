-- Test: le chiffre public de la morphologie doit être égal à la branche déclarée
-- dans le seed lovac_public_criteria, pour chaque millésime.
--
-- Garde-fou contre la régression décrite dans
-- docs/decisions/20260805142324-millesime-inclus-provenance-d-import-et-non-presence-lovac.md :
-- la frontière entre vacance FIL et vacance FIL+CCTHP était un seuil en dur, elle
-- a été décalée d'une année au détour d'un commit sans rapport, et l'erreur est
-- restée quatre mois en production (+8,8 % sur le millésime 2025).
--
-- Un millésime absent du seed est également une erreur : le chiffre public vaut
-- alors NULL, ce qui doit bloquer et non passer silencieusement.

{{ config(severity='error', error_if='>0') }}

WITH per_year AS (
    SELECT
        morphology.year
        , criteria.public_criterion
        , SUM(morphology.count_vacant_housing_private_fil_public) AS published
        , SUM(morphology.count_vacant_housing_private_fil) AS fil
        , SUM(morphology.count_vacant_housing_private_fil_ccthp) AS fil_ccthp
    FROM {{ ref('marts_common_morphology') }} AS morphology
    LEFT JOIN {{ ref('lovac_public_criteria') }} AS criteria
        ON criteria.year = morphology.year
    WHERE morphology.year IS NOT NULL
    GROUP BY morphology.year, criteria.public_criterion
)

SELECT
    year
    , public_criterion
    , published
    , fil
    , fil_ccthp
    , CASE
        WHEN public_criterion IS NULL
            THEN 'millésime absent du seed lovac_public_criteria'
        ELSE 'chiffre public différent de la branche déclarée'
    END AS issue
FROM per_year
WHERE
    public_criterion IS NULL
    OR (public_criterion = 'fil' AND published != fil)
    OR (public_criterion = 'fil_ccthp' AND published != fil_ccthp)
