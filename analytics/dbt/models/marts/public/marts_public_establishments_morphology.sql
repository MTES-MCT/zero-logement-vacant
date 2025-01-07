SELECT
    CAST(pe.id AS VARCHAR) AS establishment_id,
    year,
    SUM(count_vacant_premisses) AS count_vacant_premisses,
    SUM(count_vacant_housing) AS count_vacant_housing,
    SUM(count_vacant_housing_private) AS count_vacant_housing_private,
    SUM(count_vacant_housing_private_fil) AS count_vacant_housing_private_fil,
    SUM(count_vacant_housing_private_fil_ccthp)
        AS count_vacant_housing_private_fil_ccthp,
    SUM(count_housing) AS count_housing,
    SUM(count_housing_private) AS count_housing_private,
    SUM(count_housing_private_rented) AS count_housing_private_rented,
    SUM(count_housing_production) AS count_housing_production

FROM {{ ref ('int_production_establishments') }} pe
LEFT JOIN {{ ref ('int_production_establishments_localities') }} pel ON pe.id = pel.establishment_id
LEFT JOIN {{ ref ('marts_common_morphology') }} mcm ON pel.geo_code = mcm.geo_code
GROUP by pe.id, year
ORDER BY pe.id, year
