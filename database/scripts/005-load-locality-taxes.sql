CREATE TABLE _locality_tax_zones_
(
    code_commune text,
    Type_taxe     text,
    "thlv_taux-n+2" real
);

\set copy '\\COPY _locality_tax_zones_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE localities
    SET tax_kind = (
        case when (Type_taxe = 'TLV appliqué') then 'TLV'
             when (Type_taxe = 'THLV appliquée') then 'THLV'
        else 'None'
    end),
    tax_rate = "thlv_taux-n+2"
FROM _locality_tax_zones_ WHERE lpad(code_commune, 5, '0') = geo_code;

DROP TABLE _locality_tax_zones_;


