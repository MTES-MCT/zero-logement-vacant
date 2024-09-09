WITH vacancies_2024 AS (
    SELECT
        geo_code,
        COUNT(CASE WHEN data_year = 2024 AND vacancy_start_year = 2023 THEN 1 END) AS vac_2024_1an,
        COUNT(CASE WHEN data_year = 2024 AND vacancy_start_year = 2022 THEN 1 END) AS vac_2024_2ans,
        COUNT(CASE WHEN data_year = 2024 AND vacancy_start_year = 2021 THEN 1 END) AS vac_2024_3ans,
        COUNT(CASE WHEN data_year = 2024 AND vacancy_start_year <= 2020 THEN 1 END) AS vac_2024_4ans_plus,
        COUNT(CASE WHEN data_year = 2024 AND vacancy_start_year = 2024 THEN 1 END) AS vac_2024_moins_1an,
        COUNT(*) AS vac_2024_total
    FROM {{ ref('int_lovac_2024_ex')}} 
    GROUP BY geo_code
),
vacancies_2023 AS (
    SELECT
        geo_code,
        COUNT(CASE WHEN data_year = 2023 AND vacancy_start_year = 2022 THEN 1 END) AS vac_2023_1an,
        COUNT(CASE WHEN data_year = 2023 AND vacancy_start_year = 2021 THEN 1 END) AS vac_2023_2ans,
        COUNT(CASE WHEN data_year = 2023 AND vacancy_start_year = 2020 THEN 1 END) AS vac_2023_3ans,
        COUNT(CASE WHEN data_year = 2023 AND vacancy_start_year <= 2019 THEN 1 END) AS vac_2023_4ans_plus,
        COUNT(CASE WHEN data_year = 2023 AND vacancy_start_year = 2023 THEN 1 END) AS vac_2023_moins_1an,
        COUNT(*) AS vac_2023_total
    FROM {{ ref('int_lovac_2023_ex')}} 
    GROUP BY geo_code
)

SELECT 
    COALESCE(v2024.geo_code, v2023.geo_code) AS geo_code,
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
    COALESCE(v2024.vac_2024_total, 0) AS vac_2024_total
FROM 
    vacancies_2024 v2024
FULL OUTER JOIN 
    vacancies_2023 v2023
ON 
    v2024.geo_code = v2023.geo_code
