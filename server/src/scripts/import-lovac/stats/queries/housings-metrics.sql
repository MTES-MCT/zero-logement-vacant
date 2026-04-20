INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT 'total' AS metric, COUNT(*) AS value FROM pg.fast_housing
UNION ALL
SELECT 'null_rooms_count', COUNT(*) FROM pg.fast_housing WHERE rooms_count IS NULL
UNION ALL
SELECT 'null_living_area', COUNT(*) FROM pg.fast_housing WHERE living_area IS NULL;
