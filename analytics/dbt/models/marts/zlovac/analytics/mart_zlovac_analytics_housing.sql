-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id

SELECT
  data_year AS "Source et année",
  local_id AS "Identifiant local",
  building_id AS "Identifiant bâtiment",
  plot_id AS "Identifiant de la parcelle",
  loc_num AS "Adresse DGFIP",
  building_location AS "Localisation détaillée",
  ff_idcom AS "Code insee",
  ban_result_label AS "Adresse BAN",
  ban_result_score AS "Score BAN-DGFIP",
  ban_latitude AS "Latitude adresse BAN",
  ban_longitude AS "Longitude adresse BAN",
  ff_geomloc AS "Géolocalisation du local",
  longitude AS "longitude_DGFIP",
  latitude AS "latitude_DGFIP",
  housing_kind AS "Type du local",
  ownership_kind AS "Copropriété",
  living_area AS "Surface d'habitation",
  rooms_count AS "Nombre de pièces",
  building_year AS "Année de construction",
  uncomfortable AS "Inconfortable_class",
  cadastral_classification AS "Classement cadastral",
  beneficiary_count AS "Nombre de propriétaires",
  vl_revpro AS "Valeur locative cadastrale",
  aff AS "Occupation",
  potentiel_tlv_thlv AS "Taxe vacance",
  taxed AS "Date de début de vacance",
  mutation_date AS "Date de mutation"
FROM {{ ref('int_zlovac') }}


 
