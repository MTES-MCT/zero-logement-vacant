{{
config (
materialized = 'table',
unique_key = 'id',
)
}}

SELECT
*
FROM {{ ref ('int_production_events') }} 
