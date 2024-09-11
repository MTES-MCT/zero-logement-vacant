-- Last status of housing
WITH last_housing_status AS (
    SELECT
        e.housing_id,
        e.new_status as status,
        e.event_status_label as status_label,
        e.created_at,
        ROW_NUMBER() OVER (PARTITION BY e.housing_id ORDER BY e.created_at DESC) AS row_num
    FROM {{ ref('int_production_events') }} e
)

SELECT h.id as housing_id,
       l.status as last_event_status,
       l.status_label as last_event_status_label,
       l.created_at as last_event_date
FROM {{ ref('int_production_housing') }} h
JOIN (
    SELECT housing_id, status, status_label, created_at
    FROM last_housing_status
    WHERE row_num = 1
) l ON l.housing_id = h.id
