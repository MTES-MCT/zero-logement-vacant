-- Test: la somme des colonnes annuelles ne peut pas être INFÉRIEURE au total
-- toutes années.
--
-- Les compteurs annuels sont distincts à l'intérieur d'une année: un logement
-- recontacté en 2023 puis en 2025 compte dans chacune. La somme des années est
-- donc >= au total distinct, jamais <. Une somme inférieure signalerait une
-- année manquante dans le pivot (millésime hors de la plage compilée) ou une
-- divergence de règle entre le modèle annuel et le modèle global.
--
-- Ce test documente aussi le piège qui a produit le ticket d'origine: additionner
-- des comptages distincts ne donne pas un total.

{{ config(severity='error') }}

{% set first_year = 2020 %}
{% set last_year = modules.datetime.date.today().year %}
{% set years = range(first_year, last_year + 1) | list %}

SELECT
    establishment_id,
    logements_contactes_via_campagnes,
    (
        {% for year in years %}
        logements_contactes_via_campagnes_{{ year }}{{ " +" if not loop.last }}
        {% endfor %}
    ) AS somme_annees_campagnes,
    logements_exportes_via_groupes,
    (
        {% for year in years %}
        logements_exportes_via_groupes_{{ year }}{{ " +" if not loop.last }}
        {% endfor %}
    ) AS somme_annees_groupes,
    'Somme des annees inferieure au total toutes annees' AS issue
FROM {{ ref('marts_zlv_usage') }}
WHERE logements_contactes_via_campagnes > (
        {% for year in years %}
        logements_contactes_via_campagnes_{{ year }}{{ " +" if not loop.last }}
        {% endfor %}
    )
   OR logements_exportes_via_groupes > (
        {% for year in years %}
        logements_exportes_via_groupes_{{ year }}{{ " +" if not loop.last }}
        {% endfor %}
    )
