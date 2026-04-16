INSTALL postgres;
LOAD postgres;

ATTACH 'dbname=zlv' AS pg (TYPE postgres, SECRET '');

-- Count events by type for the given LOVAC year
-- The year filter uses the 'name' field (events store context in JSON).
-- Adjust the JSON path based on the actual events table schema.
SELECT
  type AS category,
  COUNT(*) AS value
FROM pg.events
WHERE
  type IN ('housing:occupancy-updated', 'housing:status-updated',
           'housing:owner-attached', 'housing:owner-detached', 'housing:owner-updated')
  AND created_at >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY type
ORDER BY value DESC;
