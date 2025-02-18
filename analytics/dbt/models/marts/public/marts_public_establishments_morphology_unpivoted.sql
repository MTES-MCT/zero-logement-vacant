WITH base_data AS (
    SELECT * FROM {{ ref ('marts_public_establishments_morphology') }}
)
, unpivoted_data AS (
    SELECT
        establishment_id,
        year,
        'count_vacant_premisses' AS count_type,
        count_vacant_premisses AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_vacant_housing' AS count_type,
        count_vacant_housing AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_vacant_housing_private' AS count_type,
        count_vacant_housing_private AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_vacant_housing_private_fil' AS count_type,
        count_vacant_housing_private_fil AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_vacant_housing_private_fil_ccthp' AS count_type,
        count_vacant_housing_private_fil_ccthp AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'sum_living_area_vacant_housing_private_fil_ccthp' AS count_type,
        sum_living_area_vacant_housing_private_fil_ccthp AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'sum_plot_area_vacant_housing_private_fil_ccthp' AS count_type,
        sum_plot_area_vacant_housing_private_fil_ccthp AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_housing' AS count_type,
        count_housing AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_housing_private' AS count_type,
        count_housing_private AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_housing_private_rented' AS count_type,
        count_housing_private_rented AS count_value
    FROM base_data
    UNION ALL
    -- Production 
    SELECT
        establishment_id,
        year,
        'count_housing_last_lovac_production' AS count_type,
        count_housing_last_lovac_production AS count_value
    FROM base_data
    UNION ALL

    SELECT
        establishment_id,
        year,
        'count_housing_last_ff_production' AS count_type,
        count_housing_last_ff_production AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_housing_rented_production' AS count_type,
        count_housing_rented_production AS count_value
    FROM base_data
    UNION ALL

    SELECT
        establishment_id,
        year,
        'count_housing_vacant_production' AS count_type,
        count_housing_vacant_production AS count_value
    FROM base_data
    UNION ALL
    SELECT
        establishment_id,
        year,
        'count_housing_energy_sieve_production' AS count_type,
        count_housing_energy_sieve_production AS count_value
    FROM base_data
)
, pivoted_data AS (
    SELECT
        establishment_id,
        count_type,
        CASE
            WHEN count_type = 'count_vacant_premisses' THEN 'Locaux Vacants'
            WHEN count_type = 'count_vacant_housing' THEN 'Logements Vacants'
            WHEN
                count_type = 'count_vacant_housing_private'
                THEN 'Logements Vacants du Parc Privé'
            WHEN
                count_type = 'count_vacant_housing_private_fil'
                THEN 'Logements Vacants du Parc Privé (FIL)'
            WHEN
                count_type = 'sum_living_area_vacant_housing_private_fil_ccthp'
                THEN 'Somme des surfaces habitables Vacants du Parc Privé (FIL+CCTHP)'
            WHEN
                count_type = 'sum_plot_area_vacant_housing_private_fil_ccthp'
                THEN 'Somme des surfaces foncières Vacants du Parc Privé (FIL+CCTHP)'
            WHEN
                count_type = 'count_vacant_housing_private_fil_ccthp'
                THEN 'Logements Vacants du Parc Privé (FIL+CCTHP)'
            WHEN count_type = 'count_housing' THEN 'Logements Totaux'
            WHEN
                count_type = 'count_housing_private'
                THEN 'Logements du Parc Privé'
            WHEN
                count_type = 'count_housing_private_rented'
                THEN 'Logements du Parc Privé Loués'
            WHEN
                count_type = 'count_housing_last_lovac_production'
                THEN 'LOVAC 2024 (>2 ans) - ZLV'
            WHEN
                count_type = 'count_housing_last_ff_production'
                THEN 'FF 2023 (parc privé locatif) - ZLV'
            WHEN
                count_type = 'count_housing_rented_production'
                THEN 'Loué - ZLV'
            WHEN
                count_type = 'count_housing_vacant_production'
                THEN 'Vacant - ZLV'
            WHEN
                count_type = 'count_housing_energy_sieve_production'
                THEN 'Passoire énergétique - ZLV'
        END AS count_label,
        MAX(CASE WHEN year = 2019 THEN count_value END) AS "2019",
        MAX(CASE WHEN year = 2020 THEN count_value END) AS "2020",
        MAX(CASE WHEN year = 2021 THEN count_value END) AS "2021",
        MAX(CASE WHEN year = 2022 THEN count_value END) AS "2022",
        MAX(CASE WHEN year = 2023 THEN count_value END) AS "2023",
        MAX(CASE WHEN year = 2024 THEN count_value END) AS "2024"
    FROM unpivoted_data
    GROUP BY establishment_id, count_type
)
SELECT
    establishment_id,
    count_type,
    count_label,
    "2019",
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    ("2024" - "2023") AS var_2024_2023,
    CASE
        WHEN
            "2023" != 0
            THEN ROUND((("2024" - "2023") / "2023") * 100, 2)
        ELSE NULL
    END AS var_pct_2024_2023,
    ("2023" - "2022") AS var_2023_2022,
    CASE
        WHEN
            "2022" != 0
            THEN ROUND((("2023" - "2022") / "2022") * 100, 2)
        ELSE NULL
    END AS var_pct_2023_2022,
    ("2022" - "2021") AS var_2022_2021,
    CASE
        WHEN
            "2021" != 0
            THEN ROUND((("2022" - "2021") / "2021") * 100, 2)
        ELSE NULL
    END AS var_pct_2022_2021,
    ("2021" - "2020") AS var_2021_2020,
    CASE
        WHEN
            "2020" != 0
            THEN ROUND((("2021" - "2020") / "2020") * 100, 2)
        ELSE NULL
    END AS var_pct_2021_2020,
    ("2020" - "2019") AS var_2020_2019,
    CASE
        WHEN
            "2019" != 0
            THEN ROUND((("2020" - "2019") / "2019") * 100, 2)
        ELSE NULL
    END AS var_pct_2020_2019
FROM pivoted_data
ORDER BY establishment_id, count_type
