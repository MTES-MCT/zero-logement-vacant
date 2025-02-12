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
    SUM(count_housing_last_lovac_production) AS count_housing_last_lovac_production, 
    SUM(count_housing_last_ff_production) AS count_housing_last_ff_production, 
    SUM(count_housing_rented_production) AS count_housing_rented_production, 
    SUM(count_housing_vacant_production) AS count_housing_vacant_production, 
    SUM(count_housing_energy_sieve_production) AS count_housing_energy_sieve_production,
    SUM(sum_living_area_vacant_housing_private_fil_ccthp) as sum_living_area_vacant_housing_private_fil_ccthp,
    SUM(sum_plot_area_vacant_housing_private_fil_ccthp) as sum_plot_area_vacant_housing_private_fil_ccthp
FROM {{ ref ('int_production_establishments') }} pe
LEFT JOIN {{ ref ('int_production_establishments_localities') }} pel ON pe.id = pel.establishment_id
LEFT JOIN {{ ref ('marts_common_morphology') }} mcm ON pel.geo_code = mcm.geo_code
GROUP by pe.id, year
ORDER BY pe.id, year
