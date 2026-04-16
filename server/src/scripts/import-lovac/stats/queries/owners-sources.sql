INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT data_source AS category, COUNT(*) AS value
FROM pg.owners
GROUP BY data_source
ORDER BY value DESC;
