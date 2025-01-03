{{
        config(
            materialized='table',
            unique_key='housing_id',
        )
}}
SELECT 
        CAST(h.id as VARCHAR) as housing_id,
        h.* EXCLUDE (vacancy_reasons, precisions), 
        hs.last_event_status_zlv_followup,
        hs.last_event_status_label_zlv_followup,
        hs.last_event_date_zlv_followup,
        hs.last_event_status_user_followup,
        hs.last_event_status_label_user_followup,
        hs.last_event_date_user_followup,
        hs.last_event_status_followup,
        hs.last_event_status_label_followup,
        hs.last_event_date_followup,
        hs.last_event_status_zlv_occupancy,
        hs.last_event_status_label_zlv_occupancy,
        hs.last_event_date_zlv_occupancy,
        hs.last_event_status_user_occupancy,
        hs.last_event_status_label_user_occupancy,
        hs.last_event_date_user_occupancy,
        hs.last_event_status_occupancy,
        hs.last_event_status_label_occupancy,
        hs.last_event_date_occupancy,
        CASE WHEN energy_consumption_bdnb IN ('F', 'G') THEN TRUE ELSE FALSE END as energy_sieve, 
        CASE WHEN vacancy_start_year < DATE_PART('year', CURRENT_DATE) - 3 THEN TRUE ELSE FALSE END as vacant_two_years,
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
        phg.*, 
        phe.establishment_ids,
        phe.establishment_ids_array,
        phu.has_users as is_on_user_teritory
FROM {{ ref('int_production_housing') }} h
LEFT JOIN {{ ref('int_production_housing_last_status') }} hs ON h.id = hs.housing_id
LEFT JOIN {{ ref('marts_common_cities') }} c ON h.city_code = c.city_code
LEFT JOIN {{ ref('int_production_housing_campaigns') }} phc ON phc.housing_id = h.id
LEFT JOIN {{ ref('int_production_housing_groups') }} phg ON phg.housing_id = h.id
LEFT JOIN {{ ref('int_production_housing_establishments') }} phe ON phe.housing_id = h.id
LEFT JOIN {{ ref('int_production_housing_users') }} phu ON phu.housing_id = h.id