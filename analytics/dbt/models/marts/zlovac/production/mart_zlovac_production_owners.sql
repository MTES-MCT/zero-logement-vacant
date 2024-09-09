-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id

SELECT 
    owner_fullname as "full_name",
    owner_birth_date as "birth_date",
    owner_address as "dgfip_address",
    ff_owner_idpersonne as "idpersonne",
    owner_kind_detail as "ownership_type",
    ff_owner_siren as "siren"
FROM {{ ref('int_zlovac_owners') }}
ORDER BY idpersonne ASC