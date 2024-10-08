-- Last status of housing
WITH housing_status_zlv AS (
    SELECT
        events_zlv.housing_id,
        events_zlv.new_status AS status,
        events_zlv.event_status_label AS status_label,
        events_zlv.created_at,
        ROW_NUMBER() OVER (PARTITION BY events_zlv.housing_id ORDER BY events_zlv.created_at DESC) AS row_num
    FROM {{ ref('int_production_events') }} AS events_zlv
    WHERE events_zlv.user_source = 'zlv'
), 
housing_status_user AS (
    SELECT
        events_user.housing_id,
        events_user.new_status AS status,
        events_user.event_status_label AS status_label,
        events_user.created_at,
        ROW_NUMBER() OVER (PARTITION BY events_user.housing_id ORDER BY events_user.created_at DESC) AS row_num
    FROM {{ ref('int_production_events') }} AS events_user
    WHERE events_user.user_source = 'user'
), 
housing_status AS (
    SELECT
        events_user.housing_id,
        events_user.new_status AS status,
        events_user.event_status_label AS status_label,
        events_user.created_at,
        ROW_NUMBER() OVER (PARTITION BY events_user.housing_id ORDER BY events_user.created_at DESC) AS row_num
    FROM {{ ref('int_production_events') }} AS events_user
), 
last_housing_status_zlv AS (
    SELECT 
        h.id AS housing_id,
        zlv.status AS last_event_status_zlv,
        zlv.status_label AS last_event_status_label_zlv,
        zlv.created_at AS last_event_date_zlv
    FROM {{ ref('int_production_housing') }} AS h
    JOIN (
        SELECT 
            housing_id, 
            status, 
            status_label, 
            created_at
        FROM housing_status_zlv
        WHERE row_num = 1
    ) AS zlv ON zlv.housing_id = h.id
), 
last_housing_status_user AS (
    SELECT 
        h.id AS housing_id,
        user.status AS last_event_status_user,
        user.status_label AS last_event_status_label_user,
        user.created_at AS last_event_date_user
    FROM {{ ref('int_production_housing') }} AS h
    JOIN (
        SELECT 
            housing_id, 
            status, 
            status_label, 
            created_at
        FROM housing_status_user
        WHERE row_num = 1
    ) AS user ON user.housing_id = h.id
), 
last_housing_status AS (
    SELECT 
        h.id AS housing_id,
        user.status AS last_event_status,
        user.status_label AS last_event_status_label,
        user.created_at AS last_event_date
    FROM {{ ref('int_production_housing') }} AS h
    JOIN (
        SELECT 
            housing_id, 
            status, 
            status_label, 
            created_at
        FROM housing_status
        WHERE row_num = 1
    ) AS user ON user.housing_id = h.id
)
SELECT
    COALESCE(hsz.housing_id, hsu.housing_id) AS housing_id,
    hsz.last_event_status_zlv,
    hsz.last_event_status_label_zlv,
    hsz.last_event_date_zlv,
    hsu.last_event_status_user,
    hsu.last_event_status_label_user,
    hsu.last_event_date_user, 
    hs.last_event_status,
    hs.last_event_status_label,
    hs.last_event_date
FROM last_housing_status_zlv AS hsz
FULL OUTER JOIN last_housing_status_user AS hsu
ON hsz.housing_id = hsu.housing_id
FULL OUTER JOIN last_housing_status AS hs
ON hsz.housing_id = hs.housing_id

