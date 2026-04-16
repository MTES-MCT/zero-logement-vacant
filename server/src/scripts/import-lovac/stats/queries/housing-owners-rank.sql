INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT rank::text AS category, COUNT(*) AS value
FROM pg.owners_housing
GROUP BY rank
ORDER BY rank;
