{{
config (
materialized = 'table'
)
}}
WITH deduplicated_pel AS (
SELECT
ph.housing_id,
UNNEST (ph.establishment_ids_array) AS establishment_id
FROM {{ ref ('int_production_housing_establishments') }} ph
)
SELECT
pel.housing_id,
CASE
WHEN SUM (ph.user_number) > 0 THEN TRUE
ELSE FALSE
END AS has_users
FROM deduplicated_pel AS pel
LEFT JOIN {{ ref ('int_production_establishments_users') }} ph
ON ph.establishment_id = pel.establishment_id

GROUP BY pel.housing_id
