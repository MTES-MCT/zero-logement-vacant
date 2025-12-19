-- Staging model for CEREMA DV3F Prix volumes - Bâti
-- Combines all years (2013-2024)
-- Source: dv3f_prix_volumes_communes_YYYY.xlsx - Sheet "Bâti"

{% set years = range(2013, 2024) %}

WITH 
{% for year in years %}
prix_{{ year }} AS (
    SELECT 
        CAST(codgeo AS VARCHAR) AS geo_code,
        libgeo AS commune_name,
        TRY_CAST(nbtrans_cod1 AS INTEGER) AS nb_mutations_bati,
        TRY_CAST(valeurfonc_sum_cod1 AS DOUBLE) AS valeur_fonciere_totale_bati,
        {{ year }} AS year,
        'bati' AS type_bien
    FROM {{ source('external_cerema', 'cerema_prix_volumes_' ~ year ~ '_communes_bti_raw') }}
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
