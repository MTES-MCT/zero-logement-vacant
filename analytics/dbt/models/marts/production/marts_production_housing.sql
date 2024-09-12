SELECT h.*, 
        hs.last_event_status_zlv,
        hs.last_event_status_label_zlv,
        hs.last_event_date_zlv,
        hs.last_event_status_user,
        hs.last_event_status_label_user,
        hs.last_event_date_user,
        CASE WHEN energy_consumption IN ('F', 'G') THEN TRUE ELSE FALSE END as energy_sieve, 
        CASE WHEN vacancy_start_year < DATE_PART('year', CURRENT_DATE) - 3 THEN TRUE ELSE FALSE END as vacant_two_years,
        CASE WHEN peugc.user_number IS NOT NULL THEN TRUE ELSE FALSE END as is_on_user_teritory, 
        CASE WHEN c.opah > 2 THEN TRUE ELSE FALSE END as is_in_opah_teritory,
        c.tlv1 as is_in_tlv1_teritory,
        c.tlv2 as is_in_tlv2_teritory,
        c.action_coeur_de_ville as is_in_action_coeur_de_ville_teritory, 
        c.action_coeur_de_ville_1 as is_in_action_coeur_de_ville_1_teritory,
        c.petite_ville_de_demain as is_in_petite_ville_de_demain_teritory,
        c.village_davenir as is_in_village_davenir_teritory,
        c.label, 
        c.zip_code, 
        c.avg_latitude,
        c.avg_longitude,
        c.department_name,
        c.department_number,
        c.region_name,
        c.region_geojson_name,
        phc.*, 
        phg.*
FROM {{ ref('int_production_housing') }} h
LEFT JOIN {{ ref('int_production_last_housing_status') }} hs ON h.id = hs.housing_id
JOIN {{ ref('marts_common_cities') }} c ON h.city_code = c.city_code
LEFT JOIN {{ ref('int_production_establishment_geo_code') }} peugc ON peugc.geo_code = h.geo_code AND user_number > 0
LEFT JOIN {{ ref('int_production_housing_campaigns') }} phc ON phc.housing_id = h.id
LEFT JOIN {{ ref('int_production_housing_groups') }} phg ON phg.housing_id = h.id