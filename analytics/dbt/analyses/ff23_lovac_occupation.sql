WITH ff AS (
    SELECT
        ff_idlocal,
        ff_ccthp AS occupation_ff23,
        ff_stoth AS surface,
        ff_dteloc AS nature
    FROM raw_ff_2023
    WHERE
        (
            ff_ccogrm NOT IN ('1', '2', '3', '4', '5', '6', '9')
            OR ff_ccogrm IS NULL
        )
        AND ff_ccthp != 'V'
        AND ff_dteloc IN (1, 2)
),

lovac_2022 AS (
    SELECT
        local_id AS ff_idlocal,
        TRUE AS vacant_lovac22,
        debutvacance,
        TRY_CAST(dvf_datemut AS DATE) AS mutation_date,
        dvf_libnatmut AS mutation_nature,
        dvf_valeurfonc AS mutation_value
    FROM main_stg.stg_lovac_2022
    WHERE
        1 = 1
        AND ff_ccthp IN ('V')
        AND vacancy_start_year < data_year - 2
        AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe IS NULL)
        AND aff = 'H'
        AND housing_kind IN ('APPART', 'MAISON')
        AND local_id IS NOT NULL
),

lovac_2021 AS (
    SELECT
        local_id AS ff_idlocal,
        TRUE AS vacant_lovac21,
        debutvacance,
        TRY_CAST(dvf_datemut AS DATE) AS mutation_date,
        dvf_libnatmut AS mutation_nature,
        dvf_valeurfonc AS mutation_value
    FROM main_stg.stg_lovac_2021
    WHERE
        1 = 1
        AND ff_ccthp IN ('V')
        AND vacancy_start_year < data_year - 2
        AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe IS NULL)
        AND aff = 'H'
        AND housing_kind IN ('APPART', 'MAISON')
        AND local_id IS NOT NULL
),

lovac_2020 AS (
    SELECT
        local_id AS ff_idlocal,
        TRUE AS vacant_lovac20,
        debutvacance,
        TRY_CAST(anmutation AS DATE) AS mutation_date,
        NULL AS mutation_nature,
        NULL AS mutation_value
    FROM main_stg.stg_lovac_2020
    WHERE
        1 = 1
        AND ff_ccthp IN ('V')
        AND vacancy_start_year < data_year - 2
        AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe IS NULL)
        AND aff = 'H'
        AND housing_kind IN ('APPART', 'MAISON')
        AND local_id IS NOT NULL
),

lovac_2019 AS (
    SELECT
        local_id AS ff_idlocal,
        TRUE AS vacant_lovac19,
        debutvacance,
        TRY_CAST(anmutation AS DATE) AS mutation_date,
        NULL AS mutation_nature,
        NULL AS mutation_value
    FROM main_stg.stg_lovac_2019
    WHERE
        1 = 1
        AND ff_ccthp IN ('V')
        AND vacancy_start_year < data_year - 2
        AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe IS NULL)
        AND aff = 'H'
        AND housing_kind IN ('APPART', 'MAISON')
        AND local_id IS NOT NULL
),

vacancy_data AS (
    SELECT
        ff_idlocal,
        COALESCE(lovac_2022.vacant_lovac22, FALSE) AS vacant_lovac22,
        COALESCE(lovac_2021.vacant_lovac21, FALSE) AS vacant_lovac21,
        COALESCE(lovac_2020.vacant_lovac20, FALSE) AS vacant_lovac20,
        COALESCE(lovac_2019.vacant_lovac19, FALSE) AS vacant_lovac19,
        COALESCE(
            lovac_2022.debutvacance,
            lovac_2021.debutvacance,
            lovac_2020.debutvacance,
            lovac_2019.debutvacance
        ) AS debut_vacance,
        -- Mutation indicators for each year
        COALESCE(lovac_2022.mutation_date IS NOT NULL, FALSE) AS mutation_22,
        COALESCE(lovac_2021.mutation_date IS NOT NULL, FALSE) AS mutation_21,
        COALESCE(lovac_2020.mutation_date IS NOT NULL, FALSE) AS mutation_20,
        COALESCE(lovac_2019.mutation_date IS NOT NULL, FALSE) AS mutation_19,

        -- Cumulative mutation count across years
        (
            CASE WHEN lovac_2022.mutation_date IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN lovac_2021.mutation_date IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN lovac_2020.mutation_date IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN lovac_2019.mutation_date IS NOT NULL THEN 1 ELSE 0 END)
            AS mutation_cumul,

        -- Last mutation information (most recent non-null mutation data)
        CASE
            WHEN
                COALESCE(
                    lovac_2022.mutation_date,
                    lovac_2021.mutation_date,
                    lovac_2020.mutation_date,
                    lovac_2019.mutation_date
                ) IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS last_mutation,

        COALESCE(
            lovac_2022.mutation_date,
            lovac_2021.mutation_date,
            lovac_2020.mutation_date,
            lovac_2019.mutation_date
        ) AS last_mutation_date,
        COALESCE(lovac_2022.mutation_nature, lovac_2021.mutation_nature)
            AS last_mutation_nature,
        COALESCE(lovac_2022.mutation_value, lovac_2021.mutation_value)
            AS last_mutation_value
    FROM ff
    LEFT JOIN lovac_2022 USING (ff_idlocal)
    LEFT JOIN lovac_2021 USING (ff_idlocal)
    LEFT JOIN lovac_2020 USING (ff_idlocal)
    LEFT JOIN lovac_2019 USING (ff_idlocal)
),

all_data AS (
    SELECT
        ff.ff_idlocal,
        ff.occupation_ff23,
        vacancy_data.vacant_lovac22,
        vacancy_data.vacant_lovac21,
        vacancy_data.vacant_lovac20,
        vacancy_data.vacant_lovac19,
        vacancy_data.debut_vacance,
        vacancy_data.mutation_22,
        vacancy_data.mutation_21,
        vacancy_data.mutation_20,
        vacancy_data.mutation_19,
        vacancy_data.mutation_cumul,
        vacancy_data.last_mutation,
        vacancy_data.last_mutation_date,
        vacancy_data.last_mutation_nature,
        vacancy_data.last_mutation_value,
        ff.surface,
        ff.nature
    FROM ff
    LEFT JOIN vacancy_data ON ff.ff_idlocal = vacancy_data.ff_idlocal
    WHERE
        (
            vacant_lovac22 IS TRUE
            OR vacant_lovac21 IS TRUE
            OR vacant_lovac20 IS TRUE
            OR vacant_lovac19 IS TRUE
        )
),

base_data AS (
    SELECT
        ff.ff_idlocal,
        ff.occupation_ff23 AS occupation,
        vacancy_data.vacant_lovac22,
        vacancy_data.vacant_lovac21,
        vacancy_data.vacant_lovac20,
        vacancy_data.vacant_lovac19,
        vacancy_data.last_mutation,
        vacancy_data.last_mutation_value,
        ff.surface AS surface_hab
    FROM ff
    LEFT JOIN vacancy_data ON ff.ff_idlocal = vacancy_data.ff_idlocal
)

SELECT
    occupation AS ff_ccthp,

    -- Quantité totale de logements par typologie d'occupation
    COUNT(*) AS logements,

    -- Ratio des logements dans le stock d’occupation autre que vacant
    COUNT(*)
    * 1.0
    / NULLIF(SUM(CASE WHEN occupation != 'vacant' THEN 1 ELSE 0 END), 0)
        AS ratio,

    -- Quantité et part des logements vacants pour chaque année lovac
    SUM(CASE WHEN vacant_lovac22 THEN 1 ELSE 0 END) AS from_lovac22_total,
    SUM(CASE WHEN vacant_lovac22 THEN 1 ELSE 0 END)
    * 1.0
    / NULLIF(COUNT(*), 0) AS from_lovac22_ratio,

    SUM(CASE WHEN vacant_lovac21 THEN 1 ELSE 0 END) AS from_lovac21_total,
    SUM(CASE WHEN vacant_lovac21 THEN 1 ELSE 0 END)
    * 1.0
    / NULLIF(COUNT(*), 0) AS from_lovac21_ratio,

    SUM(CASE WHEN vacant_lovac20 THEN 1 ELSE 0 END) AS from_lovac20_total,
    SUM(CASE WHEN vacant_lovac20 THEN 1 ELSE 0 END)
    * 1.0
    / NULLIF(COUNT(*), 0) AS from_lovac20_ratio,

    SUM(CASE WHEN vacant_lovac19 THEN 1 ELSE 0 END) AS from_lovac19_total,
    SUM(CASE WHEN vacant_lovac19 THEN 1 ELSE 0 END)
    * 1.0
    / NULLIF(COUNT(*), 0) AS from_lovac19_ratio,

    -- Total et ratio des logements ayant une mutation
    SUM(CASE WHEN last_mutation THEN 1 ELSE 0 END) AS mutations_total,
    SUM(CASE WHEN last_mutation THEN 1 ELSE 0 END)
    * 1.0
    / NULLIF(COUNT(*), 0) AS mutations_ratio,

    -- Valeur moyenne et médiane des mutations pour les logements ayant une valeur de mutation non vide
    AVG(last_mutation_value) FILTER (WHERE last_mutation_value IS NOT NULL)
        AS mutations_value_average,
    PERCENTILE_CONT(0.5)
        AS within
    GROUP (ORDER BY last_mutation_value) FILTER (WHERE last_mutation_value IS NOT NULL) AS mutations_value_mediane,

    -- Surface moyenne et médiane des logements
    AVG (surface_hab) AS surface_average,
    PERCENTILE_CONT (0.5) WITHIN GROUP (ORDER BY surface_hab) AS surface_mediane

FROM base_data
GROUP BY occupation;
