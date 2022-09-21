CREATE OR REPLACE PROCEDURE load_establishment_localities(CSV_PATH TEXT)
LANGUAGE plpgsql
AS $$

    BEGIN

        CREATE TABLE _localities_
        (
            codgeo  text,
            libgeo  text,
            epci    integer,
            libepci text,
            dep     text,
            reg     integer
        );

        EXECUTE 'COPY _localities_ FROM ''' || CSV_PATH || '''DELIMITER '';'' CSV HEADER';

        INSERT INTO localities (geo_code, name) (
            SELECT lpad(codgeo, 5, '0'), libgeo from _localities_
        ) ON CONFLICT (geo_code) DO NOTHING;

        INSERT INTO establishments (siren, name, localities_id) (
            SELECT DISTINCT(epci), libepci, array_agg(l2.id)
            FROM _localities_ l1, localities l2
            WHERE lpad(l1.codgeo, 5, '0') = l2.geo_code GROUP BY epci, libepci
        ) ON CONFLICT (siren) DO NOTHING;

        DROP TABLE _localities_;

    END;
$$
