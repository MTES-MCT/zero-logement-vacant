{{
config (
    materialized = 'table',
)
}}

-- Marts: usage ZLV par établissement et par année.
--
-- Version longue de `marts_zlv_usage`, destinée aux séries temporelles. Les
-- mêmes chiffres sont disponibles en colonnes larges dans `marts_zlv_usage`
-- pour les campagnes et les groupes.
--
-- ATTENTION: les compteurs de logements sont distincts à l'intérieur d'une
-- année. Ne pas sommer les années pour obtenir un total: un logement recontacté
-- deux années différentes compte dans chacune.

SELECT
    a.establishment_id,
    a.annee,

    e.name AS nom,
    ea.type_regroupe AS type_simple,
    ea.type_explicite AS type_detaille,

    a.campagnes_envoyees,
    a.logements_contactes_via_campagnes,
    a.contacts_campagnes,

    a.groupes_exportes,
    a.logements_exportes_via_groupes,
    a.exports_groupes,

    a.logements_maj_situation,
    a.logements_maj_suivi,
    a.logements_maj_occupation

FROM {{ ref ('int_analysis_establishments_zlv_usage_annuel') }} a
LEFT JOIN {{ ref ('marts_production_establishments') }} e
    ON a.establishment_id = e.establishment_id
LEFT JOIN {{ ref ('marts_production_establishments_activation') }} ea
    ON a.establishment_id = ea.establishment_id
