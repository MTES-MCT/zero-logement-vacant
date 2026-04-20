INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

SELECT year AS category, COUNT(*) AS value
FROM pg.fast_housing, UNNEST(data_file_years) AS t(year)
GROUP BY year
ORDER BY year DESC;
