{{
config (
materialized = 'table',
unique_key = ['id'],
)
}}

SELECT
    ae.*,
    CAST(u.establishment_id AS VARCHAR) AS establishment_id
FROM {{ ref ('int_production_events') }} ae
LEFT JOIN {{ ref ('marts_production_users') }} u ON ae.created_by = u.id