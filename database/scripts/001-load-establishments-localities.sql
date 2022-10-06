CREATE TABLE _localities_
(
    codgeo  text,
    libgeo  text,
    epci    integer,
    libepci text,
    dep     text,
    reg     integer
);

\set copy '\\COPY _localities_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

INSERT INTO localities (geo_code, name) (
    SELECT lpad(codgeo, 5, '0'), libgeo from _localities_
) ON CONFLICT (geo_code) DO NOTHING;

INSERT INTO establishments (siren, name, localities_geo_code) (
    SELECT DISTINCT(epci), libepci, array_agg(l2.geo_code)
    FROM _localities_ l1, localities l2
    WHERE lpad(l1.codgeo, 5, '0') = l2.geo_code GROUP BY epci, libepci
) ON CONFLICT (siren) DO NOTHING;

DROP TABLE _localities_;
