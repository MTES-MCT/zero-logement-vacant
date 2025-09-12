-- Notes liées aux logements sortis de la vacance
WITH out_housing AS (
    SELECT CAST(id AS VARCHAR) AS housing_id
    FROM {{ ref('marts_production_housing_out') }}
)
SELECT
    hn.housing_id,
    n.id AS note_id,
    n.note_kind,
    n.content,
    n.created_at,
    n.created_by,
    n.updated_at,
    n.deleted_at
FROM {{ ref('int_production_housing_notes') }} AS hn
JOIN out_housing AS oh ON oh.housing_id = hn.housing_id
JOIN {{ ref('int_production_notes') }} AS n ON n.id = hn.note_id
ORDER BY n.created_at DESC
;


