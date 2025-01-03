WITH all_owners AS (
SELECT 
    ff_owner_1_fullname AS owner_fullname,
    ff_owner_1_raw_address AS owner_address,
    ff_owner_1_birth_date AS owner_birth_date,
    ff_owner_1_idprodroit AS owner_idprodroit,
    ff_owner_1_kind_detail AS owner_kind_detail,
    ff_owner_1_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_1_fullname IS NOT NULL
    AND ff_owner_1_raw_address IS NOT NULL
UNION
SELECT 
    ff_owner_2_fullname AS owner_fullname,
    ff_owner_2_raw_address AS owner_address,
    ff_owner_2_birth_date AS owner_birth_date,
    ff_owner_2_idprodroit AS owner_idprodroit,
    ff_owner_2_kind_detail AS owner_kind_detail,
    ff_owner_2_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_2_fullname IS NOT NULL
    AND ff_owner_2_raw_address IS NOT NULL
UNION
SELECT 
    ff_owner_3_fullname AS owner_fullname,
    ff_owner_3_raw_address AS owner_address,
    ff_owner_3_birth_date AS owner_birth_date,
    ff_owner_3_idprodroit AS owner_idprodroit,
    ff_owner_3_kind_detail AS owner_kind_detail,
    ff_owner_3_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_3_fullname IS NOT NULL
    AND ff_owner_3_raw_address IS NOT NULL
UNION
SELECT 
    ff_owner_4_fullname AS owner_fullname,
    ff_owner_4_raw_address AS owner_address,
    ff_owner_4_birth_date AS owner_birth_date,
    ff_owner_4_idprodroit AS owner_idprodroit,
    ff_owner_4_kind_detail AS owner_kind_detail,
    ff_owner_4_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_4_fullname IS NOT NULL
    AND ff_owner_4_raw_address IS NOT NULL
UNION
SELECT 
    ff_owner_5_fullname AS owner_fullname,
    ff_owner_5_raw_address AS owner_address,
    ff_owner_5_birth_date AS owner_birth_date,
    ff_owner_5_idprodroit AS owner_idprodroit,
    ff_owner_5_kind_detail AS owner_kind_detail,
    ff_owner_5_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_5_fullname IS NOT NULL
    AND ff_owner_5_raw_address IS NOT NULL
UNION
SELECT 
    ff_owner_6_fullname AS owner_fullname,
    ff_owner_6_raw_address AS owner_address,
    ff_owner_6_birth_date AS owner_birth_date,
    ff_owner_6_idprodroit AS owner_idprodroit,
    ff_owner_6_kind_detail AS owner_kind_detail,
    ff_owner_6_code_droit AS owner_code_droit
FROM {{ ref('int_zlovac')}}
WHERE ff_owner_6_fullname IS NOT NULL
    AND ff_owner_6_raw_address IS NOT NULL
    AND ff_owner_6_birth_date IS NOT NULL
)
SELECT 
    owner_fullname,
    owner_address,
    owner_birth_date,
    owner_idprodroit,
    owner_kind_detail,
    owner_code_droit
FROM all_owners

