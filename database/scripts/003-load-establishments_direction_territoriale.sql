CREATE TABLE _areas_
(
    siren    integer,
    name     text,
    type     text,
    geo_codes text
);

\set copy '\\COPY _areas_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT siren, name, (select array_agg(geo_code) from localities where geo_code ~  ('^' || replace(geo_codes, ',', '|^'))), type
    FROM _areas_
) ON CONFLICT (siren) DO NOTHING;

DROP TABLE _areas_;
