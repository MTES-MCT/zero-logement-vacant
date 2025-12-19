-- Staging model for CEREMA DV3F Prix volumes - Maisons
-- Combines all years (2013-2024)
-- Source: dv3f_prix_volumes_communes_YYYY.xlsx - Sheet "Ensemble des maisons"

{% set years = range(2013, 2024) %}

WITH 
{% for year in years %}
prix_{{ year }} AS (
    SELECT 
        CAST(codgeo AS VARCHAR) AS geo_code,
        libgeo AS commune_name,
        TRY_CAST(nbtrans_cod11 AS INTEGER) AS nb_mutations_total,
        TRY_CAST(valeurfonc_sum_cod11 AS DOUBLE) AS valeur_fonciere_totale,
        TRY_CAST(nbtrans_cod111 AS INTEGER) AS nb_mutations_maisons,
        TRY_CAST(valeurfonc_sum_cod111 AS DOUBLE) AS valeur_fonciere_totale_maisons,
        TRY_CAST(valeurfonc_q25_cod111 AS DOUBLE) AS valeur_fonciere_q25_maisons,
        TRY_CAST(valeurfonc_median_cod111 AS DOUBLE) AS valeur_fonciere_median_maisons,
        TRY_CAST(valeurfonc_q75_cod111 AS DOUBLE) AS valeur_fonciere_q75_maisons,
        TRY_CAST(pxm2_q25_cod111 AS DOUBLE) AS prix_m2_q25_maisons,
        TRY_CAST(pxm2_median_cod111 AS DOUBLE) AS prix_m2_median_maisons,
        TRY_CAST(pxm2_q75_cod111 AS DOUBLE) AS prix_m2_q75_maisons,
        TRY_CAST(sbati_sum_cod111 AS DOUBLE) AS surface_bati_totale_maisons,
        TRY_CAST(sbati_median_cod111 AS DOUBLE) AS surface_bati_mediane_maisons,
        {{ year }} AS year,
        'maison' AS type_bien
    FROM {{ source('external_cerema', 'cerema_prix_volumes_' ~ year ~ '_communes_ensemble_des_maisons_raw') }}
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
