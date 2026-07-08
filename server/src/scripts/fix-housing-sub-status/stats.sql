-- Stats for housings whose status requires a sub-status but have none.
-- Statuses requiring a sub-status: 2 FIRST_CONTACT, 3 IN_PROGRESS, 4 COMPLETED, 5 BLOCKED.

-- A. Bad rows per status
SELECT status, count(*) AS bad_count
FROM fast_housing
WHERE status IN (2, 3, 4, 5) AND sub_status IS NULL
GROUP BY status
ORDER BY status;

-- B. Of those, how many have >=1 housing:status-updated event vs none, per status
WITH bad AS (
  SELECT geo_code, id, status
  FROM fast_housing
  WHERE status IN (2, 3, 4, 5) AND sub_status IS NULL
),
evented AS (
  SELECT DISTINCT he.housing_geo_code AS geo_code, he.housing_id AS id
  FROM housing_events he
  JOIN events e ON e.id = he.event_id AND e.type = 'housing:status-updated'
)
SELECT b.status,
       count(*)                AS total,
       count(ev.id)            AS with_event,
       count(*) - count(ev.id) AS without_event
FROM bad b
LEFT JOIN evented ev ON ev.geo_code = b.geo_code AND ev.id = b.id
GROUP BY b.status
ORDER BY b.status;
