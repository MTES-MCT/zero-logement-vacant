-- Staging model for Private DV3F - Prix et volumes par commune
-- Combines all years (2019-2024)
-- Source: data.gouv.fr

{% set years = [2019, 2020, 2021, 2022, 2023, 2024] %}

WITH 
{% for year in years %}
dvg_{{ year }} AS (
    SELECT 
        -- Code commune INSEE
        CAST(INSEE_COM AS VARCHAR) AS geo_code,
        
        -- Année de référence (from source or hardcoded)
        COALESCE(TRY_CAST(annee AS INTEGER), TRY_CAST(Annee AS INTEGER), {{ year }}) AS annee_reference,
        
        -- Nombre total de mutations
        TRY_CAST(COALESCE(nb_mutations, Nb_mutations) AS INTEGER) AS nb_transactions,
        
        -- Nombre par type
        TRY_CAST(NbMaisons AS INTEGER) AS nb_transactions_maisons,
        TRY_CAST(NbApparts AS INTEGER) AS nb_transactions_appartements,
        
        -- Proportions par type
        TRY_CAST(COALESCE(PropMaison, propmaison) AS DOUBLE) AS proportion_maisons,
        TRY_CAST(COALESCE(PropAppart, propappart) AS DOUBLE) AS proportion_appartements,
        
        -- Prix moyen global
        TRY_CAST(PrixMoyen AS DOUBLE) AS prix_moyen,
        
        -- Prix moyen au m² global
        TRY_CAST(Prixm2Moyen AS DOUBLE) AS prix_m2_moyen,
        
        -- Surface moyenne
        TRY_CAST(SurfaceMoy AS DOUBLE) AS surface_moyenne,
        
        -- Année pour le pivot
        {{ year }} AS year
        
    FROM {{ source('external_private', 'private_dvg_communes_' ~ year ~ '_raw') }}
    WHERE INSEE_COM IS NOT NULL
){% if not loop.last %},{% endif %}
{% endfor %},

combined AS (
    {% for year in years %}
    SELECT * FROM dvg_{{ year }}
    {% if not loop.last %}UNION ALL{% endif %}
    {% endfor %}
)

SELECT * FROM combined

