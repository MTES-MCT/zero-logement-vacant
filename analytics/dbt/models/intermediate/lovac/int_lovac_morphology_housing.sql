-- Grain: one row per (millésime, local_id), i.e. one row per *logement*.
--
-- LOVAC repeats local_id within a millésime — 0,04 % à 0,25 % des lignes selon
-- le millésime, 2026 étant le seul exact. Compter les lignes revient donc à
-- compter des locaux en les nommant logements.
--
-- Aggregation rule: a housing carries a flag as soon as ANY of its lines carries
-- it. C'est exactement la sémantique d'inclusion du comptage par lignes, moins le
-- double comptage : aucune règle métier n'est modifiée ici. Ce point importe
-- parce que vacancy_start_year — le champ qui décide de la vacance FIL — diverge
-- entre lignes d'un même local_id dans 61 % des groupes de doublons.
--
-- Voir docs/decisions/20260805142324-millesime-inclus-provenance-d-import-et-non-presence-lovac.md

SELECT
    year
    , local_id
    -- 2 local_id nationaux portent deux geo_code : choix déterministe, sans
    -- effet mesurable sur les agrégats communaux.
    , MIN(geo_code) AS geo_code
    , MAX(is_housing) AS is_housing
    , MAX(CASE WHEN is_housing = 1 AND is_private = 1 THEN 1 ELSE 0 END)
        AS is_housing_private
    , MAX(
        CASE
            WHEN is_housing = 1 AND is_private = 1 AND is_vacant_fil = 1
                THEN 1
            ELSE 0
        END
    ) AS is_housing_private_fil
    , MAX(
        CASE
            WHEN is_housing = 1 AND is_private = 1 AND is_vacant_fil_ccthp = 1
                THEN 1
            ELSE 0
        END
    ) AS is_housing_private_fil_ccthp
    -- living_area et plot_area ne divergent jamais entre lignes d'un même
    -- local_id : MAX est un choix déterministe, pas un arbitrage.
    , MAX(living_area) AS living_area
    , MAX(plot_area) AS plot_area
FROM {{ ref('int_lovac_morphology_locals') }}
GROUP BY year, local_id
