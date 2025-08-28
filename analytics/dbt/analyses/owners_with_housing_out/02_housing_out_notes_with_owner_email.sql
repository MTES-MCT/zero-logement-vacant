-- Notes des logements sortis de la vacance, restreintes aux propriétaires ayant un email
WITH out_housing AS (
    SELECT CAST(id AS VARCHAR) AS housing_id
    FROM main_marts.marts_production_housing_out
), owner_emails_raw AS (
    SELECT DISTINCT oh.housing_id, o.email
    FROM main_marts.marts_production_join_owner_housing AS oh
    JOIN main_marts.marts_production_owners AS o ON o.id = oh.owner_id
    WHERE o.email IS NOT NULL AND o.email <> ''
), owner_emails AS (
    SELECT housing_id, STRING_AGG(email, ' | ') AS owner_emails
    FROM owner_emails_raw
    GROUP BY housing_id
)
SELECT
    hn.housing_id,
    n.id AS note_id,
    n.note_kind,
    n.content,
    oe.owner_emails
FROM main_int.int_production_housing_notes AS hn
JOIN out_housing AS oh ON oh.housing_id = CAST(hn.housing_id AS VARCHAR)
JOIN owner_emails AS oe ON oe.housing_id = CAST(hn.housing_id AS VARCHAR)
JOIN main_int.int_production_notes AS n ON n.id = hn.note_id
ORDER BY n.created_at DESC
;


