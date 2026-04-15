INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

-- Total count
SELECT 'total' AS metric, COUNT(*) AS value FROM pg.owners_housing

UNION ALL

-- With idprocpte
SELECT 'with_idprocpte', COUNT(*) FROM pg.owners_housing WHERE idprocpte IS NOT NULL

UNION ALL

-- Without idprocpte
SELECT 'without_idprocpte', COUNT(*) FROM pg.owners_housing WHERE idprocpte IS NULL;

-- Breakdown by rank
SELECT rank::text AS category, COUNT(*) AS value
FROM pg.owners_housing
GROUP BY rank
ORDER BY rank;
