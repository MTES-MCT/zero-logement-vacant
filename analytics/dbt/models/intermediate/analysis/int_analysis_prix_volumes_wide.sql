-- Intermediate model: Prix volumes in wide format
-- Pivots price data across years (2013-2024) for maisons and appartements

{% set years = range(2019, 2025) %}

WITH maisons AS (
    SELECT
        geo_code,
        commune_name,
        year,
        nb_mutations_maisons,
        valeur_fonciere_totale_maisons,
        valeur_fonciere_q25_maisons,
        valeur_fonciere_median_maisons,
        valeur_fonciere_q75_maisons,
        prix_m2_median_maisons,
        prix_m2_q25_maisons,
        prix_m2_q75_maisons,
        surface_bati_totale_maisons,
        surface_bati_mediane_maisons
    FROM {{ ref('stg_external_cerema_prix_volumes_maisons') }}
),

appartements AS (
    SELECT
        geo_code,
        year,
        nb_mutations_appartements,
        valeur_fonciere_totale_appartements,
        valeur_fonciere_q25_appartements,
        valeur_fonciere_median_appartements,
        valeur_fonciere_q75_appartements,
        prix_m2_median_appartements,
        prix_m2_q25_appartements,
        prix_m2_q75_appartements,
        surface_bati_totale_appartements,
        surface_bati_mediane_appartements
    FROM {{ ref('stg_external_cerema_prix_volumes_appartements') }}
),

bati AS (
    SELECT
        geo_code,
        year,
        nb_mutations_bati,
        valeur_fonciere_totale_bati
    FROM {{ ref('stg_external_cerema_prix_volumes_bati') }}
),

-- Pivot maisons data
maisons_pivot AS (
    SELECT
        geo_code,
        MAX(commune_name) AS commune_name,
        {% for year in years %}
        MAX(CASE WHEN year = {{ year }} THEN nb_mutations_maisons END) AS nb_mutations_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_totale_maisons END) AS valeur_fonciere_totale_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_q25_maisons END) AS valeur_fonciere_q25_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_median_maisons END) AS valeur_fonciere_median_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_q75_maisons END) AS valeur_fonciere_q75_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_median_maisons END) AS prix_median_m2_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_q25_maisons END) AS prix_q25_m2_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_q75_maisons END) AS prix_q75_m2_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN surface_bati_totale_maisons END) AS surface_bati_totale_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN surface_bati_mediane_maisons END) AS surface_mediane_maisons_{{ year }}{% if not loop.last %},{% endif %}
        {% endfor %}
    FROM maisons
    GROUP BY geo_code
),

-- Pivot appartements data
appartements_pivot AS (
    SELECT
        geo_code,
        {% for year in years %}
        MAX(CASE WHEN year = {{ year }} THEN nb_mutations_appartements END) AS nb_mutations_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_totale_appartements END) AS valeur_fonciere_totale_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_q25_appartements END) AS valeur_fonciere_q25_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_median_appartements END) AS valeur_fonciere_median_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_q75_appartements END) AS valeur_fonciere_q75_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_median_appartements END) AS prix_median_m2_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_q25_appartements END) AS prix_q25_m2_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_q75_appartements END) AS prix_q75_m2_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN surface_bati_totale_appartements END) AS surface_bati_totale_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN surface_bati_mediane_appartements END) AS surface_mediane_appartements_{{ year }}{% if not loop.last %},{% endif %}
        {% endfor %}
    FROM appartements
    GROUP BY geo_code
),

-- Pivot bati data
bati_pivot AS (
    SELECT
        geo_code,
        {% for year in years %}
        MAX(CASE WHEN year = {{ year }} THEN nb_mutations_bati END) AS nb_mutations_bati_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN valeur_fonciere_totale_bati END) AS valeur_fonciere_totale_bati_{{ year }}{% if not loop.last %},{% endif %}
        {% endfor %}
    FROM bati
    GROUP BY geo_code
)

SELECT
    m.geo_code,
    m.commune_name,
    
    -- Maisons data by year
    {% for year in years %}
    m.nb_mutations_maisons_{{ year }},
    m.valeur_fonciere_totale_maisons_{{ year }},
    m.valeur_fonciere_q25_maisons_{{ year }},
    m.valeur_fonciere_median_maisons_{{ year }},
    m.valeur_fonciere_q75_maisons_{{ year }},
    m.prix_median_m2_maisons_{{ year }},
    m.prix_q25_m2_maisons_{{ year }},
    m.prix_q75_m2_maisons_{{ year }},
    m.surface_bati_totale_maisons_{{ year }},
    m.surface_mediane_maisons_{{ year }},
    {% endfor %}
    
    -- Appartements data by year
    {% for year in years %}
    a.nb_mutations_appartements_{{ year }},
    a.valeur_fonciere_totale_appartements_{{ year }},
    a.valeur_fonciere_q25_appartements_{{ year }},
    a.valeur_fonciere_median_appartements_{{ year }},
    a.valeur_fonciere_q75_appartements_{{ year }},
    a.prix_median_m2_appartements_{{ year }},
    a.prix_q25_m2_appartements_{{ year }},
    a.prix_q75_m2_appartements_{{ year }},
    a.surface_bati_totale_appartements_{{ year }},
    a.surface_mediane_appartements_{{ year }},
    {% endfor %}
    
    -- Bati data by year
    {% for year in years %}
    b.nb_mutations_bati_{{ year }},
    b.valeur_fonciere_totale_bati_{{ year }}{% if not loop.last %},{% endif %}
    {% endfor %},
    
    -- Price evolution indicators (2019 to 2023)
    CASE 
        WHEN m.prix_median_m2_maisons_2019 > 0 AND m.prix_median_m2_maisons_2023 > 0
        THEN ROUND((m.prix_median_m2_maisons_2023 - m.prix_median_m2_maisons_2019) * 100.0 / m.prix_median_m2_maisons_2019, 2)
        ELSE NULL
    END AS evolution_prix_maisons_2019_2023_pct,
    
    CASE 
        WHEN a.prix_median_m2_appartements_2019 > 0 AND a.prix_median_m2_appartements_2023 > 0
        THEN ROUND((a.prix_median_m2_appartements_2023 - a.prix_median_m2_appartements_2019) * 100.0 / a.prix_median_m2_appartements_2019, 2)
        ELSE NULL
    END AS evolution_prix_appartements_2019_2023_pct,
    
    -- Total transactions over period
    COALESCE(m.nb_mutations_maisons_2019, 0) + COALESCE(m.nb_mutations_maisons_2020, 0) + 
    COALESCE(m.nb_mutations_maisons_2021, 0) + COALESCE(m.nb_mutations_maisons_2022, 0) + 
    COALESCE(m.nb_mutations_maisons_2023, 0) + COALESCE(m.nb_mutations_maisons_2024, 0) AS total_mutations_maisons_2019_2024,
    
    COALESCE(a.nb_mutations_appartements_2019, 0) + COALESCE(a.nb_mutations_appartements_2020, 0) + 
    COALESCE(a.nb_mutations_appartements_2021, 0) + COALESCE(a.nb_mutations_appartements_2022, 0) + 
    COALESCE(a.nb_mutations_appartements_2023, 0) + COALESCE(a.nb_mutations_appartements_2024, 0) AS total_mutations_appartements_2019_2024

FROM maisons_pivot m
LEFT JOIN appartements_pivot a ON m.geo_code = a.geo_code
LEFT JOIN bati_pivot b ON m.geo_code = b.geo_code
