-- Test de régression KPI sur marts_zlv_usage.
--
-- Chaque seuil est un plancher volontairement bas par rapport à la mesure du
-- 2026-08-05, pour détecter un passage à zéro (source renommée, jointure cassée,
-- filtre trop restrictif) sans se déclencher sur une variation normale. Les
-- valeurs mesurées à la mise en place sont indiquées en commentaire.
--
-- Sévérité 'warn': un franchissement mérite un regard, pas un blocage du DAG.

{{ config(severity='warn') }}

WITH mesures AS (
    SELECT
        COUNT(*) FILTER (WHERE logements_maj_situation > 0) AS etabs_avec_maj,
        SUM(logements_contactes_via_campagnes) AS logements_contactes,
        SUM(logements_exportes_via_groupes) AS logements_exportes,
        SUM(logements_maj_enrichissement) AS logements_enrichis,
        COUNT(*) FILTER (WHERE logements_maj_dpe > 0) AS etabs_avec_dpe,
        COUNT(*) FILTER (WHERE communes_inscrites IS NOT NULL) AS etabs_avec_echelon_communal,
        COUNT(*) FILTER (WHERE intercommunalites_inscrites IS NOT NULL) AS etabs_avec_echelon_epci
    FROM {{ ref('marts_zlv_usage') }}
),

seuils AS (
    -- (libellé, valeur mesurée, plancher)
    SELECT 'etabs_avec_maj' AS kpi, etabs_avec_maj AS valeur, 500 AS plancher FROM mesures            -- mesuré 636+
    UNION ALL SELECT 'logements_contactes', logements_contactes, 120000 FROM mesures                  -- mesuré 149 069
    UNION ALL SELECT 'logements_exportes', logements_exportes, 1500000 FROM mesures                   -- mesuré 2 014 977
    UNION ALL SELECT 'logements_enrichis', logements_enrichis, 50000 FROM mesures                     -- mesuré 68 006
    UNION ALL SELECT 'etabs_avec_dpe', etabs_avec_dpe, 1 FROM mesures                                 -- mesuré 20
    UNION ALL SELECT 'etabs_avec_echelon_communal', etabs_avec_echelon_communal, 1500 FROM mesures    -- mesuré 1 693
    UNION ALL SELECT 'etabs_avec_echelon_epci', etabs_avec_echelon_epci, 300 FROM mesures             -- mesuré 425
)

SELECT
    kpi,
    valeur,
    plancher,
    'KPI sous son plancher de regression' AS issue
FROM seuils
WHERE valeur IS NULL OR valeur < plancher
