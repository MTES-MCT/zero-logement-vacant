SELECT 
    CAST(pe.id as VARCHAR) as establishment_id, 
    year,
    SUM(count_vacant_premisses) as count_vacant_premisses,
    SUM(count_vacant_housing) as count_vacant_housing,
    SUM(count_vacant_housing_private) as count_vacant_housing_private,
    SUM(count_vacant_housing_private_fil) as count_vacant_housing_private_fil,
    SUM(count_vacant_housing_private_fil_ccthp) as count_vacant_housing_private_fil_ccthp,
    SUM(count_housing) as  count_housing,
    SUM(count_housing_private) as count_housing_private,
    SUM(count_housing_private_rented) as count_housing_private_rented,
    SUM(current_production_count_housing) as current_production_count_housing,
    SUM(current_production_count_vacant_housing) as current_production_count_vacant_housing,
    SUM(current_production_count_rented_housing) as current_production_count_rented_housing,
FROM {{ ref('int_production_establishments') }} pe 
LEFT JOIN {{ ref('int_production_establishments_localities')}} pel ON pe.id = pel.establishment_id
LEFT JOIN {{ ref('marts_common_morphology')}} mcm ON pel.geo_code = mcm.geo_code
GROUP by pe.id, year
ORDER BY pe.id, year