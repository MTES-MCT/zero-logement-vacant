INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT kind_class AS category, COUNT(*) AS value
FROM pg.owners
GROUP BY kind_class
ORDER BY value DESC;
