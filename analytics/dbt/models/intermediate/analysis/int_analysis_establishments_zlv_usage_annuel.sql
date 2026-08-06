-- Usage ZLV par établissement ET par année.
--
-- Grain: une ligne par (establishment_id, annee). Source unique de vérité pour
-- les colonnes annuelles pivotées dans `marts_zlv_usage` et pour les séries
-- temporelles de `marts_zlv_usage_annuel`.
--
-- Millésime retenu: `campaigns.sent_at` pour les campagnes, `groups.exported_at`
-- pour les groupes, `events.created_at` pour les mises à jour de situation.
--
-- ATTENTION: les compteurs de logements sont distincts À L'INTÉRIEUR d'une
-- année. Un logement recontacté en 2023 puis en 2025 compte dans les deux, donc
-- SUM(années) >= total distinct toutes années. C'est voulu: chaque année doit
-- répondre à "combien de logements distincts cette année-là".

WITH campaign_years AS (
    SELECT
        CAST(pc.establishment_id AS VARCHAR) AS establishment_id,
        EXTRACT(YEAR FROM pc.sent_at) AS annee,
        COUNT(DISTINCT pc.campaign_id) AS campagnes_envoyees,
        COUNT(DISTINCT pch.housing_id) AS logements_contactes_via_campagnes,
        COUNT(pch.housing_id) AS contacts_campagnes
    FROM {{ ref ('int_production_campaigns') }} pc
    JOIN {{ ref ('int_production_campaigns_housing') }} pch
        ON pc.campaign_id = pch.campaign_id
    WHERE pc.sent_at IS NOT NULL
    GROUP BY 1, 2
),

group_years AS (
    SELECT
        CAST(pg.establishment_id AS VARCHAR) AS establishment_id,
        EXTRACT(YEAR FROM pg.exported_at) AS annee,
        COUNT(DISTINCT pg.id) AS groupes_exportes,
        COUNT(DISTINCT phg.housing_id) AS logements_exportes_via_groupes,
        COUNT(phg.housing_id) AS exports_groupes
    FROM {{ ref ('stg_production_groups') }} pg
    JOIN {{ ref ('stg_production_groups_housing') }} phg
        ON pg.id = phg.group_id
    WHERE pg.exported_at IS NOT NULL
    GROUP BY 1, 2
),

situation_years AS (
    SELECT
        establishment_id,
        EXTRACT(YEAR FROM created_at) AS annee,
        COUNT(DISTINCT housing_id) AS logements_maj_situation,
        COUNT(DISTINCT CASE WHEN status_changed THEN housing_id END) AS logements_maj_suivi,
        COUNT(DISTINCT CASE WHEN occupancy_changed THEN housing_id END) AS logements_maj_occupation
    FROM {{ ref ('int_production_events') }}
    WHERE user_source = 'user'
      AND (status_changed OR occupancy_changed)
      AND type IN ('housing:status-updated', 'housing:occupancy-updated')
      AND establishment_id IS NOT NULL
      AND housing_id IS NOT NULL
    GROUP BY 1, 2
),

all_keys AS (
    SELECT establishment_id, annee FROM campaign_years
    UNION
    SELECT establishment_id, annee FROM group_years
    UNION
    SELECT establishment_id, annee FROM situation_years
)

SELECT
    k.establishment_id,
    CAST(k.annee AS INTEGER) AS annee,

    COALESCE(cy.campagnes_envoyees, 0) AS campagnes_envoyees,
    COALESCE(cy.logements_contactes_via_campagnes, 0) AS logements_contactes_via_campagnes,
    COALESCE(cy.contacts_campagnes, 0) AS contacts_campagnes,

    COALESCE(gy.groupes_exportes, 0) AS groupes_exportes,
    COALESCE(gy.logements_exportes_via_groupes, 0) AS logements_exportes_via_groupes,
    COALESCE(gy.exports_groupes, 0) AS exports_groupes,

    COALESCE(sy.logements_maj_situation, 0) AS logements_maj_situation,
    COALESCE(sy.logements_maj_suivi, 0) AS logements_maj_suivi,
    COALESCE(sy.logements_maj_occupation, 0) AS logements_maj_occupation

FROM all_keys k
LEFT JOIN campaign_years cy
    ON k.establishment_id = cy.establishment_id AND k.annee = cy.annee
LEFT JOIN group_years gy
    ON k.establishment_id = gy.establishment_id AND k.annee = gy.annee
LEFT JOIN situation_years sy
    ON k.establishment_id = sy.establishment_id AND k.annee = sy.annee
