CREATE TABLE _buildings_
(
    increment     text,
    id            text,
    housing_count text
);

\set copy '\\COPY _buildings_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

DELETE FROM _buildings_ WHERE housing_count = 'nb_bat';

INSERT INTO buildings (id, housing_count, vacant_housing_count) (
    SELECT id, housing_count::integer, 0 FROM _buildings_
)
ON CONFLICT ON CONSTRAINT buildings_pkey DO UPDATE
    SET housing_count = excluded.housing_count;

DROP TABLE _buildings_;



