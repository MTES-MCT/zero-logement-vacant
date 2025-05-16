WITH vacancies_2025 AS (
    SELECT
        geo_code,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year = 2023 THEN 1 END
        ) AS vac_2025_1an,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year = 2023 THEN 1 END
        ) AS vac_2025_2ans,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year <= 2022 THEN 1 END
        ) AS vac_2025_plus_2ans,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year >= 2023 THEN 1 END
        ) AS vac_2025_moins_2ans,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year = 2022 THEN 1 END
        ) AS vac_2025_3ans,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year <= 2021 THEN 1 END
        ) AS vac_2025_4ans_plus,
        COUNT(
            CASE WHEN data_year = 2025 AND vacancy_start_year = 2025 THEN 1 END
        ) AS vac_2025_moins_1an,
        COUNT(*) AS vac_2025_total
    FROM {{ ref ('int_lovac_ex_2025') }}
    GROUP BY geo_code
),vacancies_2024 AS (
    SELECT
        geo_code,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year = 2023 THEN 1 END
        ) AS vac_2024_1an,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year = 2022 THEN 1 END
        ) AS vac_2024_2ans,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year <= 2021 THEN 1 END
        ) AS vac_2024_plus_2ans,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year >= 2022 THEN 1 END
        ) AS vac_2024_moins_2ans,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year = 2021 THEN 1 END
        ) AS vac_2024_3ans,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year <= 2020 THEN 1 END
        ) AS vac_2024_4ans_plus,
        COUNT(
            CASE WHEN data_year = 2024 AND vacancy_start_year = 2024 THEN 1 END
        ) AS vac_2024_moins_1an,
        COUNT(*) AS vac_2024_total
    FROM {{ ref ('int_lovac_ex_2024') }}
    GROUP BY geo_code
),

vacancies_2023 AS (
    SELECT
        geo_code,
        COUNT(
            CASE WHEN data_year = 2023 AND vacancy_start_year = 2022 THEN 1 END
        ) AS vac_2023_1an,
        COUNT(
            CASE WHEN data_year = 2023 AND vacancy_start_year = 2021 THEN 1 END
        ) AS vac_2023_2ans,
        COUNT(
            CASE WHEN data_year = 2023 AND vacancy_start_year = 2020 THEN 1 END
        ) AS vac_2023_3ans,
        COUNT(
            CASE WHEN data_year = 2023 AND vacancy_start_year <= 2019 THEN 1 END
        ) AS vac_2023_4ans_plus,
        COUNT(
            CASE WHEN data_year = 2023 AND vacancy_start_year = 2023 THEN 1 END
        ) AS vac_2023_moins_1an,
        COUNT(*) AS vac_2023_total
    FROM {{ ref ('int_lovac_ex_2023') }}
    GROUP BY geo_code
),

vacancies_2020 AS (
    SELECT
        geo_code,
        COUNT(
            CASE WHEN data_year = 2020 AND vacancy_start_year = 2019 THEN 1 END
        ) AS vac_2020_1an,
        COUNT(
            CASE WHEN data_year = 2020 AND vacancy_start_year = 2018 THEN 1 END
        ) AS vac_2020_2ans,
        COUNT(
            CASE WHEN data_year = 2020 AND vacancy_start_year = 2017 THEN 1 END
        ) AS vac_2020_3ans,
        COUNT(
            CASE WHEN data_year = 2020 AND vacancy_start_year <= 2016 THEN 1 END
        ) AS vac_2020_4ans_plus,
        COUNT(
            CASE WHEN data_year = 2020 AND vacancy_start_year = 2020 THEN 1 END
        ) AS vac_2020_moins_1an,
        COUNT(*) AS vac_2020_total
    FROM {{ ref ('int_lovac_ex_2020') }}
    GROUP BY geo_code
),

all_data AS (

    SELECT
        COALESCE(v2025.geo_code, v2025.geo_code, v2023.geo_code) AS geo_code,
        COALESCE(v2025.vac_2025_moins_1an, 0) AS vac_2025_moins_1an,
        COALESCE(v2025.vac_2025_1an, 0) AS vac_2025_1an,
        COALESCE(v2025.vac_2025_2ans, 0) AS vac_2025_2ans,
        COALESCE(v2025.vac_2025_3ans, 0) AS vac_2025_3ans,
        COALESCE(v2025.vac_2025_4ans_plus, 0) AS vac_2025_4ans_plus,
        

        COALESCE(v2024.vac_2024_moins_1an, 0) AS vac_2024_moins_1an,
        COALESCE(v2024.vac_2024_1an, 0) AS vac_2024_1an,
        COALESCE(v2024.vac_2024_2ans, 0) AS vac_2024_2ans,
        COALESCE(v2024.vac_2024_3ans, 0) AS vac_2024_3ans,
        COALESCE(v2024.vac_2024_4ans_plus, 0) AS vac_2024_4ans_plus,

        COALESCE(v2023.vac_2023_moins_1an, 0) AS vac_2023_moins_1an,
        COALESCE(v2023.vac_2023_1an, 0) AS vac_2023_1an,
        COALESCE(v2023.vac_2023_2ans, 0) AS vac_2023_2ans,
        COALESCE(v2023.vac_2023_3ans, 0) AS vac_2023_3ans,
        COALESCE(v2023.vac_2023_4ans_plus, 0) AS vac_2023_4ans_plus,
        COALESCE(v2023.vac_2023_total, 0) AS vac_2023_total,

        COALESCE(v2020.vac_2020_moins_1an, 0) AS vac_2020_moins_1an,
        COALESCE(v2020.vac_2020_1an, 0) AS vac_2020_1an,
        COALESCE(v2020.vac_2020_2ans, 0) AS vac_2020_2ans,
        COALESCE(v2020.vac_2020_3ans, 0) AS vac_2020_3ans,
        COALESCE(v2020.vac_2020_4ans_plus, 0) AS vac_2020_4ans_plus,

        COALESCE(v2020.vac_2020_total, 0) AS vac_2020_total,
        COALESCE(v2023.vac_2023_total, 0) AS vac_2023_total,
        COALESCE(v2024.vac_2024_total, 0) AS vac_2024_total,
        COALESCE(v2024.vac_2024_plus_2ans, 0) AS vac_2024_plus_2ans,
        COALESCE(v2024.vac_2024_moins_2ans, 0) AS vac_2024_moins_2ans
    FROM
        vacancies_2025 v2025
    FULL OUTER JOIN
        vacancies_2024 v2024
        ON
            v2025.geo_code = v2024.geo_code
    FULL OUTER JOIN
        vacancies_2023 v2023
        ON
            v2024.geo_code = v2023.geo_code
    FULL OUTER JOIN
        vacancies_2020 v2020
        ON
            v2024.geo_code = v2020.geo_code
)

SELECT * FROM all_data
WHERE geo_code IS NOT NULL
