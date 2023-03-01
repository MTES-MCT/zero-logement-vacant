CREATE TABLE _localities_
(
    reg       integer,
    dep       text,
    siren     integer,
    geo_code  text,
    name      text
);

\set copy '\\COPY _localities_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

INSERT INTO localities (geo_code, name) (
    SELECT lpad(geo_code, 5, '0'), name from _localities_
) ON CONFLICT (geo_code) DO NOTHING;

INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT siren,
           (case when left(upper(name) , 1) in ('A','E','I','O','U') then 'Commune d''' || name
                 else 'Commune de ' || name
           end),
           array[geo_code],
           'Commune'
    FROM _localities_
) ON CONFLICT (siren) DO NOTHING;

DROP TABLE _localities_;
