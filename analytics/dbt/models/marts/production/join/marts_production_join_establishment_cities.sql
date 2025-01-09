SELECT
    CAST(pe.id AS VARCHAR) AS establishment_id,
    UNNEST(pe.localities_geo_code) AS geo_code
FROM {{ ref ('int_production_establishments') }} pe
