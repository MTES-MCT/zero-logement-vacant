WITH all_events AS (
    SELECT
        id,
        created_at,
        created_by,
        housing_id,
        new_status,
        new_sub_status,
        name,
        simple_name,
        status_changed,
        new_status_raw,
        old_status_raw,
        occupancy_changed,
        new_occupancy,
        old_occupancy,
        version,
        category
    FROM
    {{ ref ('int_production_events_old') }}
    UNION DISTINCT
    SELECT
        id,
        created_at,
        created_by,
        housing_id,
        new_status,
        new_sub_status,
        name,
        simple_name,
        status_changed,
        new_status_raw,
        old_status_raw,
        occupancy_changed,
        new_occupancy,
        old_occupancy,
        version,
        category
    FROM
    {{ ref ('int_production_events_new') }}
)

SELECT
    ae.*,
    s.new AS event_status_label,
    coalesce(user_type, 'user') AS user_source
FROM
    all_events ae
LEFT JOIN {{ ref ('int_production_users') }} u ON ae.created_by = u.id
LEFT JOIN {{ ref ('status') }} s ON s.status = ae.new_status
