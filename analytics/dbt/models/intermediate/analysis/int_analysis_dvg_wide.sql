-- Intermediate model: DV3F/DVG data in wide format
-- Pivots transaction data across years (2019-2024)
-- Source: DVG communes data from data.gouv.fr

{% set years = [2019, 2020, 2021, 2022, 2023, 2024] %}

WITH dvg_data AS (
    SELECT
        geo_code,
        year,
        nb_transactions,
        nb_transactions_maisons,
        nb_transactions_appartements,
        proportion_maisons,
        proportion_appartements,
        prix_moyen,
        prix_m2_moyen,
        surface_moyenne
    FROM {{ ref('stg_external_private_dvg_communes') }}
),

pivoted AS (
    SELECT
        geo_code,
        
        -- Total transactions by year
        {% for year in years %}
        MAX(CASE WHEN year = {{ year }} THEN nb_transactions END) AS nb_transactions_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN nb_transactions_maisons END) AS nb_transactions_maisons_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN nb_transactions_appartements END) AS nb_transactions_appartements_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_moyen END) AS prix_moyen_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN prix_m2_moyen END) AS prix_m2_moyen_{{ year }},
        MAX(CASE WHEN year = {{ year }} THEN surface_moyenne END) AS surface_moyenne_{{ year }}{% if not loop.last %},{% endif %}
        {% endfor %}
    FROM dvg_data
    GROUP BY geo_code
)

SELECT
    geo_code,
    
    -- Transaction data by year
    {% for year in years %}
    nb_transactions_{{ year }},
    nb_transactions_maisons_{{ year }},
    nb_transactions_appartements_{{ year }},
    prix_moyen_{{ year }},
    prix_m2_moyen_{{ year }},
    surface_moyenne_{{ year }},
    {% endfor %}
    
    -- Total transactions 2019-2024
    COALESCE(nb_transactions_2019, 0) + COALESCE(nb_transactions_2020, 0) + 
    COALESCE(nb_transactions_2021, 0) + COALESCE(nb_transactions_2022, 0) + 
    COALESCE(nb_transactions_2023, 0) + COALESCE(nb_transactions_2024, 0) AS total_transactions_2019_2024,
    
    -- Average annual transactions
    (COALESCE(nb_transactions_2019, 0) + COALESCE(nb_transactions_2020, 0) + 
     COALESCE(nb_transactions_2021, 0) + COALESCE(nb_transactions_2022, 0) + 
     COALESCE(nb_transactions_2023, 0) + COALESCE(nb_transactions_2024, 0)) / 6.0 AS avg_annual_transactions,
    
    -- Price evolution 2019-2023 (using mean price per m²)
    CASE 
        WHEN prix_m2_moyen_2019 > 0 AND prix_m2_moyen_2023 > 0
        THEN ROUND((prix_m2_moyen_2023 - prix_m2_moyen_2019) * 100.0 / prix_m2_moyen_2019, 2)
        ELSE NULL
    END AS evolution_prix_m2_2019_2023_pct,
    
    -- Market dynamism indicator
    CASE
        WHEN (COALESCE(nb_transactions_2019, 0) + COALESCE(nb_transactions_2020, 0) + 
              COALESCE(nb_transactions_2021, 0) + COALESCE(nb_transactions_2022, 0) + 
              COALESCE(nb_transactions_2023, 0) + COALESCE(nb_transactions_2024, 0)) >= 100 THEN 'Très dynamique'
        WHEN (COALESCE(nb_transactions_2019, 0) + COALESCE(nb_transactions_2020, 0) + 
              COALESCE(nb_transactions_2021, 0) + COALESCE(nb_transactions_2022, 0) + 
              COALESCE(nb_transactions_2023, 0) + COALESCE(nb_transactions_2024, 0)) >= 30 THEN 'Dynamique'
        WHEN (COALESCE(nb_transactions_2019, 0) + COALESCE(nb_transactions_2020, 0) + 
              COALESCE(nb_transactions_2021, 0) + COALESCE(nb_transactions_2022, 0) + 
              COALESCE(nb_transactions_2023, 0) + COALESCE(nb_transactions_2024, 0)) >= 10 THEN 'Modéré'
        ELSE 'Faible'
    END AS marche_dynamisme

FROM pivoted

