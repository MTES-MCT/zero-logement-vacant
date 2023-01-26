CREATE TABLE _locality_tax_zones_
(
    code_commune text,
    type_taxe     text,
    taux double precision
);

\set copy '\\COPY _locality_tax_zones_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE localities
    SET tax_kind = coalesce(type_taxe, 'None'), tax_rate = round((taux * 100)::numeric, 1)
FROM _locality_tax_zones_ WHERE lpad(code_commune, 5, '0') = geo_code;

DROP TABLE _locality_tax_zones_;


