DROP TABLE IF EXISTS _areas_;

CREATE TABLE _areas_
(
    siren    integer,
    name     text,
    type     text,
    geo_codes text
);

\set copy '\\COPY _areas_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

INSERT INTO establishments (siren, name, available, localities_geo_code, kind, source) (
    SELECT DISTINCT ON (siren) siren, name, FALSE, (select array_agg(geo_code) from localities where geo_code ~  ('^' || replace(geo_codes, ',', '|^'))), type, 'seed'
    FROM _areas_
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code, kind = EXCLUDED.kind;

DROP TABLE _areas_;
