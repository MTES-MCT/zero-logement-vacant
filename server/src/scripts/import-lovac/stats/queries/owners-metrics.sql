INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT 'total' AS metric, COUNT(*) AS value FROM pg.owners
UNION ALL
SELECT 'with_idpersonne', COUNT(*) FROM pg.owners WHERE idpersonne IS NOT NULL
UNION ALL
SELECT 'without_idpersonne', COUNT(*) FROM pg.owners WHERE idpersonne IS NULL
UNION ALL
SELECT 'with_dgfip_address', COUNT(*) FROM pg.owners WHERE address_dgfip IS NOT NULL
UNION ALL
SELECT 'without_dgfip_address', COUNT(*) FROM pg.owners WHERE address_dgfip IS NULL;
