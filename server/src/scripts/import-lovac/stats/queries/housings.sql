INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

-- Total count
SELECT 'total' AS metric, COUNT(*) AS value FROM pg.fast_housing

UNION ALL

-- With NULL rooms_count
SELECT 'null_rooms_count', COUNT(*) FROM pg.fast_housing WHERE rooms_count IS NULL

UNION ALL

-- With NULL living_area
SELECT 'null_living_area', COUNT(*) FROM pg.fast_housing WHERE living_area IS NULL;

-- Breakdown by occupancy
SELECT occupancy AS category, COUNT(*) AS value
FROM pg.fast_housing
GROUP BY occupancy
ORDER BY value DESC;

-- Breakdown by status
SELECT status AS category, COUNT(*) AS value
FROM pg.fast_housing
GROUP BY status
ORDER BY value DESC;

-- Count tagged with each data_file_year (unnested)
SELECT year AS category, COUNT(*) AS value
FROM pg.fast_housing, UNNEST(data_file_years) AS t(year)
GROUP BY year
ORDER BY year DESC;
