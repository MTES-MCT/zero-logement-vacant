-- Staging model for CEREMA DV3F Prix volumes - Appartements
-- Combines all years (2013-2024)
-- Source: dv3f_prix_volumes_communes_YYYY.xlsx - Sheet "Ensemble des appartements"

{% set years = range(2013, 2024) %}

WITH 
{% for year in years %}
prix_{{ year }} AS (
    SELECT 
        CAST(codgeo AS VARCHAR) AS geo_code,
        libgeo AS commune_name,
        TRY_CAST(nbtrans_cod12 AS INTEGER) AS nb_mutations_total,
        TRY_CAST(valeurfonc_sum_cod12 AS DOUBLE) AS valeur_fonciere_totale,
        TRY_CAST(nbtrans_cod121 AS INTEGER) AS nb_mutations_appartements,
        TRY_CAST(valeurfonc_sum_cod121 AS DOUBLE) AS valeur_fonciere_totale_appartements,
        TRY_CAST(valeurfonc_q25_cod121 AS DOUBLE) AS valeur_fonciere_q25_appartements,
        TRY_CAST(valeurfonc_median_cod121 AS DOUBLE) AS valeur_fonciere_median_appartements,
        TRY_CAST(valeurfonc_q75_cod121 AS DOUBLE) AS valeur_fonciere_q75_appartements,
        TRY_CAST(pxm2_q25_cod121 AS DOUBLE) AS prix_m2_q25_appartements,
        TRY_CAST(pxm2_median_cod121 AS DOUBLE) AS prix_m2_median_appartements,
        TRY_CAST(pxm2_q75_cod121 AS DOUBLE) AS prix_m2_q75_appartements,
        TRY_CAST(sbati_sum_cod121 AS DOUBLE) AS surface_bati_totale_appartements,
        TRY_CAST(sbati_median_cod121 AS DOUBLE) AS surface_bati_mediane_appartements,
        {{ year }} AS year,
        'appartement' AS type_bien
    FROM {{ source('external_cerema', 'cerema_prix_volumes_' ~ year ~ '_communes_ensemble_des_appartements_raw') }}
    WHERE codgeo IS NOT NULL
){% if not loop.last %},{% endif %}
{% endfor %},

combined AS (
    {% for year in years %}
    SELECT * FROM prix_{{ year }}
    {% if not loop.last %}UNION ALL{% endif %}
    {% endfor %}
)

SELECT * FROM combined
