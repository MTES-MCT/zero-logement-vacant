INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT status AS category, COUNT(*) AS value
FROM pg.fast_housing
GROUP BY status
ORDER BY value DESC;
