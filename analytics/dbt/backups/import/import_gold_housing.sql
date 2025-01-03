WITH ff_data AS (
    SELECT
        ff_idlocal,
        ff_jdatat AS last_mutation_date,
        ff_dcapec2 AS cadastral_classification,
        ff_dcntpa AS plot_area,
        ff_geomloc AS geometry,
        ff_ccthp AS occupancy,
        ST_X(ST_Transform(ST_GeomFromWKB(FROM_HEX(ff_geomloc)), 'EPSG:2154', 'EPSG:4326')) AS latitude,
        ST_Y(ST_Transform(ST_GeomFromWKB(FROM_HEX(ff_geomloc)), 'EPSG:2154', 'EPSG:4326')) AS longitude
    FROM {{ ref('int_ff_ext_2023') }}
),
lovac_2024 AS (
    SELECT 
        ff_idlocal,
        ff_dcntpa AS plot_area,
        ff_jdatat AS last_mutation_date,
        dvf_datemut AS last_transaction_date,
        dvf_valeurfonc AS last_transaction_value,
        ffh_ccthp AS occupancy_history,
        ban_latitude AS latitude,
        ban_longitude AS longitude,
        'lovac-2024' AS data_file_years
    FROM {{ ref('int_lovac_fil_2024') }}
),
lovac_2023 AS (
    SELECT 
        ff_idlocal, 
        ff_dcntpa AS plot_area,
        ff_jdatat AS last_mutation_date,
        dvf_datemut AS last_transaction_date,
        dvf_valeurfonc AS last_transaction_value,
        ffh_ccthp AS occupancy_history,
        ban_latitude AS latitude,
        ban_longitude AS longitude,
        'lovac-2023' AS data_file_years
    FROM {{ ref('int_lovac_fil_2023') }}
), 
lovac_history AS (
    SELECT * FROM {{ ref('int_lovac_history_housing') }}
), clean_data as (

SELECT 
    COALESCE(l24.ff_idlocal, l23.ff_idlocal, fd.ff_idlocal) AS local_id,
    COALESCE(l24.plot_area, l23.plot_area, fd.plot_area) AS plot_area,
    fd.cadastral_classification AS cadastral_classification,
    COALESCE(l24.latitude, l23.latitude, fd.latitude) AS latitude,
    COALESCE(l24.longitude, l23.longitude, fd.longitude) AS longitude,
    COALESCE(l24.last_mutation_date, l23.last_mutation_date, fd.last_mutation_date) AS last_mutation_date,
    COALESCE(l24.last_transaction_date, l23.last_transaction_date) AS last_transaction_date,
    COALESCE(l24.last_transaction_value, l23.last_transaction_value) AS last_transaction_value,
    COALESCE(l24.occupancy_history, l23.occupancy_history) AS occupancy_history
FROM ff_data fd
FULL OUTER JOIN lovac_2024 l24 ON fd.ff_idlocal = l24.ff_idlocal
FULL OUTER JOIN lovac_2023 l23 ON COALESCE(fd.ff_idlocal, l24.ff_idlocal) = l23.ff_idlocal
)

SELECT local_id,
    plot_area,
    cadastral_classification,
    latitude,
    longitude,
    CASE
        WHEN TRY_CAST(TRY_STRPTIME(last_mutation_date, '%d%m%Y') AS DATE) IS NOT NULL THEN
            TRY_STRPTIME(last_mutation_date, '%d%m%Y')
        ELSE
            DATE_TRUNC('month', TRY_STRPTIME(last_mutation_date, '%d%m%Y'))
            + INTERVAL '1 month' - INTERVAL '1 day'
        END AS last_mutation_date,
    last_transaction_date,
    last_transaction_value,
    occupancy_history,
FROM clean_data