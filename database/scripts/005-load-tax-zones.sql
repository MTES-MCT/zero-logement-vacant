CREATE TABLE _locality_tax_zones_
(
    id_commune text,
    zonage     text
);

\set copy '\\COPY _locality_tax_zones_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE localities SET tax_zone = zonage FROM _locality_tax_zones_ WHERE id_commune = geo_code;

DROP TABLE _locality_tax_zones_;
