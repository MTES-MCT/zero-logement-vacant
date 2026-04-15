INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

-- Total count
SELECT 'total' AS metric, COUNT(*) AS value FROM pg.owners

UNION ALL

-- With idpersonne
SELECT 'with_idpersonne', COUNT(*) FROM pg.owners WHERE idpersonne IS NOT NULL

UNION ALL

-- Without idpersonne
SELECT 'without_idpersonne', COUNT(*) FROM pg.owners WHERE idpersonne IS NULL

UNION ALL

-- With dgfip address
SELECT 'with_dgfip_address', COUNT(*) FROM pg.owners WHERE address_dgfip IS NOT NULL

UNION ALL

-- Without dgfip address
SELECT 'without_dgfip_address', COUNT(*) FROM pg.owners WHERE address_dgfip IS NULL;

-- Breakdown by kind_class
SELECT kind_class AS category, COUNT(*) AS value
FROM pg.owners
GROUP BY kind_class
ORDER BY value DESC;

-- Breakdown by data_source
SELECT data_source AS category, COUNT(*) AS value
FROM pg.owners
GROUP BY data_source
ORDER BY value DESC;
