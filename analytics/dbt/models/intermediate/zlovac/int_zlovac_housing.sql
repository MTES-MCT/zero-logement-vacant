-- int_zlovac_housing.sql
-- Gold Housing table for LOVAC 2026.
-- Maps to Table Housing_26 specification from the LOVAC documentation.

SELECT
    invariant,
    local_id,
    building_id,
    dgfip_address,
    geo_code,
    longitude as longitude_dgfip,
    latitude as latitude_dgfip,
    cadastral_classification,
    uncomfortable,
    vacancy_start_year,
    housing_kind,
    rooms_count,
    living_area,
    building_year,
    mutation_date,
    building_location,
    ownership_kind as condominium,
    plot_id,
    data_file_years,
    geolocation,
    geolocation_source,
    plot_area,
    ff_jdatat as last_mutation_date,
    dvf_datemut as last_transaction_date,
    dvf_valeurfonc as last_transaction_value,
    ffh_ccthp as occupancy_history,
    dvf_libnatmut as last_mutation_type
FROM {{ ref ('int_zlovac') }}
