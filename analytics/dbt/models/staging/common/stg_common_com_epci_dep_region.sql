SELECT
com_code as geo_code, 
com_siren,
com_name,
epci_siren,
epci_name,
dep_siren,
dep_name,
reg_siren,
reg_name,
ept_siren,
ept_name

FROM {{ ref('com_epci_dep_reg')}}