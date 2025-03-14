SELECT
    building_id,
    NULL AS id,
    NULL AS increment,
    SUM(
        CASE
            WHEN building_id <> local_id AND ff_ccthp = 'V' THEN 1
            ELSE 0
        END
    ) AS "housing_vacant_count",
    SUM(
        CASE
            WHEN building_id <> local_id AND ff_ccthp = 'L' THEN 1
            ELSE 0
        END
    ) AS "housing_rent_count"
FROM {{ ref ('int_zlovac') }}
GROUP BY building_id
