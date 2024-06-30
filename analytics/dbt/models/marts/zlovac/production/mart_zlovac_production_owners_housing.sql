-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id

SELECT 
    NULL as	owner_id,
    NULL as	housing_id,
	ownership_score,
    local_id,
    ff_owner_idpersonne,
	ownership_score_reason,
	conflict,
    owner_birth_date,
    owner_fullname,
    owner_postal_code,
    ff_owner_idprodroit,
    ff_owner_idprocpte,
    rank
    FROM {{ ref('int_zlovac_owner_housing') }}
