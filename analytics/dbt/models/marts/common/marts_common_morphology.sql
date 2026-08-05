WITH premisses_geo_code_year AS (
    SELECT
        year
        , geo_code
        , COUNT(*) AS count_vacant_premisses
    FROM {{ ref("int_lovac_morphology_locals") }}
    GROUP BY year, geo_code
),

lovac_geo_code_year AS (
    SELECT
        year
        , geo_code
        , SUM(is_housing) AS count_vacant_housing
        , SUM(is_housing_private) AS count_vacant_housing_private
        , SUM(is_housing_private_fil) AS count_vacant_housing_private_fil
        , SUM(is_housing_private_fil_ccthp)
            AS count_vacant_housing_private_fil_ccthp
        , SUM(CASE WHEN is_housing_private_fil_ccthp = 1 THEN living_area ELSE 0 END)
            AS sum_living_area_vacant_housing_private_fil_ccthp
        , SUM(CASE WHEN is_housing_private_fil_ccthp = 1 THEN plot_area ELSE 0 END)
            AS sum_plot_area_vacant_housing_private_fil_ccthp
    FROM {{ ref("int_lovac_morphology_housing") }}
    GROUP BY year, geo_code
),

all_ff AS (
    SELECT
        2026 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2025") }}
    UNION ALL
    SELECT
        2025 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2025") }}
    UNION ALL
    SELECT
        2024 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2024") }}
    UNION ALL 
    SELECT
        2023 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2023") }}
    UNION ALL
    SELECT
        2022 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2022") }}
    UNION ALL
    SELECT
        2021 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2021") }}
    UNION ALL
    SELECT
        2020 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2020") }}
    UNION ALL
    SELECT
        2019 AS year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc
    FROM {{ ref ("stg_lovac_ff_ext_2019") }}
),

ff AS (
    SELECT
        year
        , geo_code
        , CASE
            WHEN
                (
                    ff_ccogrm NOT IN ('1', '2', '3', '4', '5', '6', '9')
                    OR ff_ccogrm IS NULL
                )
                THEN 1
            ELSE 0
        END AS is_private
        , CASE WHEN ff_ccthp = 'L' THEN 1 ELSE 0 END AS is_rented
    FROM all_ff
    WHERE ff_dteloc IN ('1', '2')
),

ff_geo_code_year AS (
    SELECT
        year, geo_code
        , COUNT(*) AS count_housing
        , SUM(is_private) AS count_housing_private
        , SUM(IF(is_private = 1 AND is_rented = 1, 1, 0))
            AS count_housing_private_rented
    FROM ff
    GROUP BY year, geo_code
),

production AS (
    SELECT
        geo_code,
        SUM(CASE WHEN list_contains(data_file_years, 'lovac-2026') THEN 1 ELSE 0 END) AS housing_last_lovac_count,
        SUM(CASE WHEN list_contains(data_file_years, 'ff-2024-locatif') THEN 1 ELSE 0 END) AS housing_last_ff_count,
        SUM(CASE WHEN occupancy = 'L' THEN 1 ELSE 0 END) AS housing_rented_count,
        SUM(CASE WHEN occupancy = 'V' THEN 1 ELSE 0 END) AS housing_vacant_count,
        SUM(CASE WHEN energy_consumption_bdnb IN ('G', 'F') THEN 1 ELSE 0 END) AS housing_energy_sieve_count,
        2026 AS year
    FROM {{ ref ("int_production_housing") }} as h
    WHERE list_contains(data_file_years, 'lovac-2026')
    GROUP BY geo_code
),

-- Parc ZLV importé, par millésime : les logements que ZLV a effectivement
-- importés de chaque fichier LOVAC. C'est la population que le filtre
-- « Millésimes inclus » du Parc de logements sélectionne, et elle est
-- structurellement un sous-ensemble du stock LOVAC mesuré plus haut. Exposer les
-- deux côte à côte est le seul moyen de rendre l'écart lisible.
production_tagged_lovac AS (
    SELECT
        geo_code
        , CAST(REPLACE(data_file_year, 'lovac-', '') AS INTEGER) AS year
        , COUNT(*) AS housing_tagged_count
    FROM (
        SELECT
            geo_code
            , UNNEST(data_file_years) AS data_file_year
        FROM {{ ref ("int_production_housing") }}
    )
    WHERE data_file_year LIKE 'lovac-%'
    GROUP BY geo_code, year
),

public_criteria AS (
    SELECT
        CAST(year AS INTEGER) AS year
        , public_criterion
    FROM {{ ref ("lovac_public_criteria") }}
)
SELECT
    year
    , geo_code
    , city_code
    , production.housing_last_lovac_count AS count_housing_last_lovac_production
    , production_tagged.housing_tagged_count
        AS count_housing_tagged_lovac_production
    , production.housing_last_ff_count AS count_housing_last_ff_production
    , production.housing_rented_count AS count_housing_rented_production
    , production.housing_vacant_count AS count_housing_vacant_production
    , production.housing_energy_sieve_count AS count_housing_energy_sieve_production
    , premisses.count_vacant_premisses
    , lovac.count_vacant_housing
    , lovac.count_vacant_housing_private
    , lovac.count_vacant_housing_private_fil
    , lovac.count_vacant_housing_private_fil_ccthp
    -- Le critère retenu pour le chiffre public est déclaré par millésime dans le
    -- seed lovac_public_criteria, jamais déduit d'un seuil. Un millésime non
    -- déclaré donne NULL et fait échouer
    -- tests/data_quality/test_morphology_public_criterion_declared.sql : ce
    -- silence-là est exactement ce qui a laissé passer quatre mois d'erreur sur
    -- 2025.
    , CASE
        WHEN criteria.public_criterion = 'fil'
            THEN lovac.count_vacant_housing_private_fil
        WHEN criteria.public_criterion = 'fil_ccthp'
            THEN lovac.count_vacant_housing_private_fil_ccthp
    END AS count_vacant_housing_private_fil_public
    , lovac.sum_living_area_vacant_housing_private_fil_ccthp
    , lovac.sum_plot_area_vacant_housing_private_fil_ccthp
    , ff.count_housing
    , ff.count_housing_private
    , ff.count_housing_private_rented
    , CASE WHEN (merged.geo_code_destination IS NOT NULL) THEN 1 ELSE 0 END
        AS merged_this_year
    , CASE WHEN (splited.geo_code_destination IS NOT NULL) THEN 1 ELSE 0 END
        AS split_this_year
    , merged.geo_code_destination AS merged_destionation_geocode
    , merged.libelle_destination AS merged_destination_label
    , splited.geo_code_destination AS split_destination_geocode
    , splited.libelle_destination AS split_destination_label
    , com_name AS city_label
    , code_departement AS dep_code
    , nom_departement AS dep_label
    , code_region AS region_code
    , nom_region AS region_label
    , epci_siren
    , epci_name AS epci_label
-- La base est le comptage des locaux : il porte tous les couples
-- (millésime, commune) présents dans les fichiers, y compris ceux qui ne
-- contiennent aucun logement au sens de la morphologie.
FROM premisses_geo_code_year premisses
LEFT JOIN lovac_geo_code_year lovac USING (year, geo_code)
LEFT OUTER JOIN ff_geo_code_year ff USING (year, geo_code)
LEFT JOIN production USING (year, geo_code)
LEFT JOIN production_tagged_lovac production_tagged USING (year, geo_code)
LEFT JOIN public_criteria criteria USING (year)
LEFT JOIN {{ ref ("int_common_cities_mapping") }} USING (geo_code)
LEFT JOIN {{ ref ("int_common_com_epci_dep_region") }} USING (geo_code)
LEFT JOIN {{ ref ("int_common_departements_france") }} ON code_departement = geo_code [1: 2]
LEFT JOIN {{ ref ("stg_common_fusions") }} merged ON geo_code = merged.geo_code_source AND merged.year = year
LEFT JOIN {{ ref ("stg_common_scissions") }} splited ON geo_code = splited.geo_code_source AND splited.year = year
ORDER BY geo_code
