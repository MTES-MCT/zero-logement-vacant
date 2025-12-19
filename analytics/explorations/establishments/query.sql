SELECT siren_db.siren, siren_db.nicSiegeUniteLegale, siren_geo_db.plg_code_commune
FROM read_parquet('/Users/raphaelcourivaud/Downloads/Base Sirene SIREN SIRET.parquet') siren_db
JOIN read_parquet('/Users/raphaelcourivaud/Downloads/Geolocalisation Etablissement Sirene Statistiques.parquet') siren_geo_db 
    ON (siren_db.siren || lpad(CAST(siren_db.nicSiegeUniteLegale as VARCHAR), 5, '0')) = siren_geo_db.siret
WHERE denominationUniteLegale LIKE '%COMMUNE%'
  AND denominationUniteLegale LIKE '%SAINT PIERRE%'
  AND plg_code_commune LIKE '975%'
LIMIT 10;