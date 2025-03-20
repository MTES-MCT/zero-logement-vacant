WITH establishment_localities AS (
    SELECT
        pe.id AS establishment_id,
        UNNEST(pe.localities_geo_code) AS geo_code
    FROM {{ ref ('int_production_establishments') }} pe
)

SELECT
    DISTINCT el.establishment_id, el.geo_code
FROM establishment_localities el
