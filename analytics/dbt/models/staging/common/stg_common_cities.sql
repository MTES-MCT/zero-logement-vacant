SELECT 
TYPECOM as city_kind, 
COM as geo_code, 
REG	as region_code,
DEP	as department_code, 
CTCD as ctcd,
ARR as arr, 
TNCC as tncc,
NCC as ncc, 
NCCENR as nccenr,
LIBELLE as libelle, 
CAN as can, 
COMPARENT as comparent
FROM {{ ref ('cog_20240101') }}
