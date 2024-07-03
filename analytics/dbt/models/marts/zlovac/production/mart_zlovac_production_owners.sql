-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id

SELECT 
    NULL as "id",
    NULL as "Administrator",
    owner_fullname as "full_name",
    owner_birth_date as "birth_date",
    owner_address as "raw_address",
    NULL as "Additional Address",
    owner_kind_detail as "kind"
FROM {{ ref('int_zlovac_owners') }}
