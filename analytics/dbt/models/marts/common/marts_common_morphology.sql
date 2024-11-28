WITH all_lovac AS (
    SELECT 2024 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
    FROM {{ ref("stg_lovac_2024")}}
             UNION ALL
    SELECT 2023 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
    FROM {{ ref("stg_lovac_2023") }}
             UNION ALL
    SELECT 2022 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
     FROM {{ ref("stg_lovac_2022") }}
             UNION ALL
    SELECT 2021 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
     FROM {{ ref("stg_lovac_2021") }}
                 UNION ALL
    SELECT 2020 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
     FROM {{ ref("stg_lovac_2020") }}
                     UNION ALL
    SELECT 2019 as year, local_id, geo_code, vacancy_start_year, data_year, ff_ccthp, housing_kind, aff, groupe 
     FROM {{ ref("stg_lovac_2019") }}
), all_ff AS (
    SELECT 2024 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2023") }}
            UNION ALL -- todo: change to 2024 when its available
    SELECT 2023 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2023") }}
              UNION ALL
    SELECT 2022 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2022") }}
              UNION ALL
    SELECT 2021 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2021") }}
        UNION ALL
    SELECT 2020 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2020") }}
            UNION ALL
    SELECT 2019 as year, ff_idlocal, geo_code, ff_ccogrm, ff_ccthp, ff_dteloc  FROM {{ ref("stg_ff_ext_2019") }}
), lovac AS(
    SELECT
        local_id
        , year
        , geo_code
        , CASE WHEN (housing_kind IN ('APPART', 'MAISON') AND aff = 'H') THEN 1 ELSE 0 END AS is_housing
        , CASE WHEN (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe is NULL) THEN 1 ELSE 0 END AS is_private
        , CASE WHEN vacancy_start_year < data_year - 2 THEN 1 ELSE 0 END AS is_vacant_fil
        , CASE WHEN (ff_ccthp IN ('V') AND vacancy_start_year < data_year - 2) THEN 1 ELSE 0 END AS is_vacant_fil_ccthp
    FROM all_lovac
), lovac_geo_code_year AS (
    SELECT year
      , geo_code
      , COUNT(*) as count_vacant_premisses
      , SUM(is_housing) as count_vacant_housing
      , SUM(CASE WHEN is_housing = 1 AND is_private = 1 THEN 1 ELSE 0 END) as count_vacant_housing_private
      , SUM(CASE WHEN is_housing = 1 AND is_private = 1 AND is_vacant_fil = 1 THEN 1 ELSE 0 END) as count_vacant_housing_private_fil
      , SUM(CASE WHEN is_housing = 1 AND is_private = 1 AND is_vacant_fil_ccthp = 1 THEN 1 ELSE 0 END) as count_vacant_housing_private_fil_ccthp
    FROM lovac
    GROUP BY year, geo_code
),ff AS (
    SELECT year
        , geo_code
        , CASE WHEN (ff_ccogrm NOT IN ('1','2','3','4','5','6','9') OR ff_ccogrm IS NULL)  THEN 1 ELSE 0 END AS is_private
        , CASE WHEN ff_ccthp = 'L' THEN 1 ELSE 0 END AS is_rented
    FROM all_ff
    WHERE ff_dteloc IN ('1', '2')
), ff_geo_code_year AS (
    SELECT year, geo_code
           , COUNT(*) count_housing
           , SUM(is_private) AS count_housing_private
           , SUM(IF(is_private = 1 AND is_rented = 1, 1, 0)) AS count_housing_private_rented
    FROM ff
    GROUP BY year, geo_code
)
SELECT year
        , geo_code
        , city_code
        , lovac.count_vacant_premisses
        , lovac.count_vacant_housing
        , lovac.count_vacant_housing_private
        , lovac.count_vacant_housing_private_fil
        , lovac.count_vacant_housing_private_fil_ccthp
        , ff.count_housing
        , ff.count_housing_private
        , ff.count_housing_private_rented
        , CASE WHEN(merged.geo_code_destination IS NOT NULL) THEN 1 ELSE 0 END AS merged_this_year
        , CASE WHEN(splited.geo_code_destination IS NOT NULL) THEN 1 ELSE 0 END AS split_this_year
        , merged.geo_code_destination as merged_destionation_geocode
        , merged.libelle_destination  as merged_destination_label
        , splited.geo_code_destination as split_destination_geocode
        , splited.libelle_destination as split_destination_label
        , com_name as city_label
        , code_departement as dep_code
        , nom_departement as dep_label
        , code_region as region_code
        , nom_region as region_label
        , epci_siren as epci_siren
        , epci_name as epci_label
    FROM lovac_geo_code_year lovac
    LEFT OUTER JOIN ff_geo_code_year ff USING(year, geo_code)
    LEFT JOIN {{ ref("int_common_cities_mapping")}} USING(geo_code)
    LEFT JOIN {{ ref("int_common_com_epci_dep_region")}} USING(geo_code)
    LEFT JOIN {{ ref("int_common_departements_france")}} ON code_departement = geo_code[1:2]
    LEFT JOIN {{ ref("stg_common_fusions")}} merged ON geo_code = merged.geo_code_source AND merged.year = year
    LEFT JOIN {{ ref("stg_common_scissions")}} splited ON geo_code = splited.geo_code_source AND splited.year = year
ORDER BY geo_code