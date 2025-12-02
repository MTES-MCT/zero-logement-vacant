{{
config (
materialized = 'table',
unique_key = ['id'],
)
}}

SELECT
    ae.id,
    ae.created_at,
    ae.created_by,
    ae.housing_id,
    ae.type,
    ae.owner_id,
    ae.new_status,
    ae.new_sub_status,
    ae.name,
    ae.simple_name,
    ae.status_changed,
    ae.new_status_raw,
    ae.old_status_raw,
    ae.occupancy_changed,
    ae.new_occupancy,
    ae.old_occupancy,
    ae.category,
    ae.new_status_refined,
    ae.event_version,
    ae.user_source,
    ae.establishment_id,
    NULL as content
FROM {{ ref ('int_production_events') }} ae
UNION ALL 
SELECT 
    nae.id,
    nae.created_at,
    nae.created_by,
    nae.housing_id,
    NULL as type,
    nae.owner_id,
    NULL as new_status,
    NULL as new_sub_status,
    NULL as name,
    NULL as simple_name,
    NULL as status_changed,
    NULL as new_status_raw,
    NULL as old_status_raw,
    NULL as occupancy_changed,
    NULL as new_occupancy,
    NULL as old_occupancy,
    nae.category,
    NULL as new_status_refined,
    NULL as event_version,
    nae.user_source,
    nae.establishment_id, 
    nae.content
FROM {{ ref ('int_production_notes_as_events') }} nae