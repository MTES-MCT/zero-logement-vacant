SELECT h.*, 
        hs.last_event_status,
        hs.last_event_status_label,
        hs.last_event_date,
        CASE WHEN energy_consumption IN ('F', 'G') THEN TRUE ELSE FALSE END as energy_sieve, 
        CASE WHEN vacancy_start_year < DATE_PART('year', CURRENT_DATE) - 3 THEN TRUE ELSE FALSE END as vacant_two_years,
        CASE WHEN peugc.user_number IS NOT NULL THEN TRUE ELSE FALSE END as is_on_user_teritory, 
        c.*, 
        phc.*
FROM {{ ref('int_production_housing') }} h
LEFT JOIN {{ ref('int_production_last_housing_status') }} hs ON h.id = hs.housing_id
JOIN {{ ref('int_common_cities') }} c ON h.geo_code = c.insee_code
LEFT JOIN {{ ref('int_production_establishment_geo_code') }} peugc ON peugc.geo_code = h.geo_code AND user_number > 0
LEFT JOIN {{ ref('int_production_housing_campaigns') }} phc ON phc.housing_id = h.id