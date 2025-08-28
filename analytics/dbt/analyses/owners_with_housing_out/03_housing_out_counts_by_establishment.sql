-- Comptes par établissement des logements sortis de la vacance
-- 1) total logements sortis par établissement
-- 2) logements sortis avec au moins un propriétaire ayant un email

WITH out_housing AS (
    SELECT CAST(id AS VARCHAR) AS housing_id
    FROM main_marts.marts_production_housing_out
), housing_establishments AS (
    SELECT
        phe.housing_id,
        UNNEST(phe.establishment_ids_array) AS establishment_id
    FROM main_int.int_production_housing_establishments AS phe
), owner_emails AS (
    SELECT DISTINCT oh.housing_id
    FROM main_marts.marts_production_join_owner_housing AS oh
    JOIN main_marts.marts_production_owners AS o ON o.id = oh.owner_id
    WHERE o.email IS NOT NULL AND o.email <> ''
), out_housing_with_estab AS (
    SELECT he.establishment_id, he.housing_id
    FROM housing_establishments he
    JOIN out_housing oh ON oh.housing_id = he.housing_id
)
SELECT
    CAST(e.establishment_id AS VARCHAR) AS establishment_id,
    e.name AS establishment_name,
    COUNT(DISTINCT ohe.housing_id) AS housing_out_total,
    COUNT(DISTINCT CASE WHEN oe.housing_id IS NOT NULL THEN ohe.housing_id END) AS housing_out_with_owner_email
FROM (
    SELECT pe.id AS establishment_id, pe.name
    FROM main_int.int_production_establishments pe
) e
LEFT JOIN out_housing_with_estab ohe ON ohe.establishment_id = e.establishment_id
LEFT JOIN owner_emails oe ON oe.housing_id = ohe.housing_id
GROUP BY 1, 2
ORDER BY housing_out_total DESC
;


