CREATE OR REPLACE PROCEDURE load_buildings (CSV_PATH TEXT)
LANGUAGE plpgsql
AS $$

    BEGIN

        CREATE TABLE _buildings_
        (
            increment     text,
            id            text,
            housing_count text
        );

        EXECUTE 'COPY _buildings_ FROM ''' || CSV_PATH || '''DELIMITER '';'' CSV HEADER';

        DELETE FROM _buildings_ WHERE housing_count = 'nb_bat';

        INSERT INTO buildings (id, housing_count, vacant_housing_count) (
            SELECT id, housing_count::integer, 0 FROM _buildings_
        )
        ON CONFLICT ON CONSTRAINT buildings_pkey DO UPDATE
            SET housing_count = excluded.housing_count;

        DROP TABLE _buildings_;

    END;
$$



