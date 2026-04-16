INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT 'total' AS metric, COUNT(*) AS value FROM pg.owners_housing
UNION ALL
SELECT 'with_idprocpte', COUNT(*) FROM pg.owners_housing WHERE idprocpte IS NOT NULL
UNION ALL
SELECT 'without_idprocpte', COUNT(*) FROM pg.owners_housing WHERE idprocpte IS NULL;
