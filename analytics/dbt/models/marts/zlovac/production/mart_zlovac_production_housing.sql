-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id
SELECT
  data_year AS "date_file_years",
  local_id,
  building_id,
  plot_id,
  loc_num AS "address_dgfip",
  building_location AS "location_detail",
  ff_idcom AS "geo_code",
  ban_result_label AS "ban_address",
  ban_result_score AS "score_ban_dgfip",
  ban_latitude AS "ban_latitude",
  ban_longitude AS "ban_longitude",
  ff_geomloc AS "geolocalisation",
  longitude AS "longitude_DGFIP",
  latitude AS "latitude_DGFIP",
  housing_kind,
  ownership_kind AS condominium,
  living_area,
  rooms_count,
  building_year,
  uncomfortable,
  cadastral_classification,
  beneficiary_count,
  vl_revpro AS "rental_value",
  aff AS "occupancy_source",
  potentiel_tlv_thlv AS "taxed",
  vacancy_start_year,
  mutation_date
    FROM {{ ref('int_zlovac_housing') }}


 
