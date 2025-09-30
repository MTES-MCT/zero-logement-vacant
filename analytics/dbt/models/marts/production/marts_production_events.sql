{{
config (
materialized = 'table',
unique_key = ['id'],
)
}}

SELECT
    ae.*,
    CAST(oh.owner_id AS VARCHAR) AS owner_id,
    CAST(u.establishment_id AS VARCHAR) AS establishment_id
FROM {{ ref ('int_production_events') }} ae
LEFT JOIN {{ ref ('marts_production_join_owner_housing') }} oh ON ae.housing_id = oh.housing_id
LEFT JOIN {{ ref ('marts_production_users') }} u ON ae.created_by = u.id 
