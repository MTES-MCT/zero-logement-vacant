INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT occupancy AS category, COUNT(*) AS value
FROM pg.fast_housing
GROUP BY occupancy
ORDER BY value DESC;
