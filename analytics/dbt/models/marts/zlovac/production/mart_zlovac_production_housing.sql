SELECT
  'lovac-' || data_year AS "data_file_years",
  'lovac' AS "data_source",
  local_id,
  building_id,
  plot_id,
  building_location AS "location_detail",
  ff_idcom AS "geo_code",
  ban_result_label AS "ban_address",
  ban_result_score AS "ban_score",
  ban_latitude AS "ban_latitude",
  ban_longitude AS "ban_longitude",
  ff_geomloc AS "geolocalisation",
  dgfip_address AS "dgfip_address",
  longitude AS "dgfip_longitude",
  latitude AS "dgfip_latitude",
  housing_kind,
  ownership_kind AS condominium,
  living_area,
  rooms_count,
  building_year,
  uncomfortable,
  cadastral_classification,
  beneficiary_count,
  ff_ccthp AS "occupancy_source",
  taxed,
  vacancy_start_year,
  mutation_date
FROM {{ ref('int_zlovac_housing') }}
ORDER BY local_id ASC

 
