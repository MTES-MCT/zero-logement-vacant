CREATE TABLE _establishment_kinds_
(
    siren     integer,
    kind      text
);

\set copy '\\COPY _establishment_kinds_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE establishments
SET kind = _e.kind
FROM _establishment_kinds_ _e
WHERE establishments.siren = _e.siren;

DROP TABLE _establishment_kinds_;
