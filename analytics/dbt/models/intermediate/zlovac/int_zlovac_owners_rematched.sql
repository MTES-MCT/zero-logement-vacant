-- int_zlovac_owners_rematched.sql
-- This model matches owners between ZLOVAC and ZFF data
-- based on exact fullname and address matches

WITH zlovac_owners AS (
    SELECT 
        local_id,
        owner_fullname,
        CONCAT_WS(' ', 
            NULLIF(TRIM(owner_adresse1), ''),
            NULLIF(TRIM(owner_adresse2), ''),
            NULLIF(TRIM(owner_adresse3), ''),
            NULLIF(TRIM(owner_adresse4), '')
        ) as zlovac_full_address
    FROM {{ ref('int_zlovac') }}
    WHERE owner_fullname IS NOT NULL 
    AND TRIM(owner_fullname) != ''
),

zff_owners AS (
    SELECT 
        owner_idpersonne,
        CONCAT_WS(' ', 
            NULLIF(TRIM(dqualp), ''),
            NULLIF(TRIM(dnomus), ''),
            NULLIF(TRIM(dprnus), '')
        ) as zff_fullname,
        CONCAT_WS(' ', 
            NULLIF(TRIM(dlign3), ''),
            NULLIF(TRIM(dlign4), ''),
            NULLIF(TRIM(dlign5), ''),
            NULLIF(TRIM(dlign6), '')
        ) as zff_full_address
    FROM {{ ref('stg_ff_owners_2024') }}
    WHERE dqualp IS NOT NULL 
    OR dnomus IS NOT NULL 
    OR dprnus IS NOT NULL
)

SELECT 
    z.local_id,
    zff.owner_idpersonne,
    z.owner_fullname as zlovac_owner_fullname,
    zff.zff_fullname as zff_owner_fullname,
    z.zlovac_full_address,
    zff.zff_full_address, 
    NULL as owner_property_rights ,
    NULL as owner_property_rights_detail,
FROM zlovac_owners z
INNER JOIN zff_owners zff
    ON UPPER(TRIM(z.owner_fullname)) = UPPER(TRIM(zff.zff_fullname))
    AND UPPER(TRIM(z.zlovac_full_address)) = UPPER(TRIM(zff.zff_full_address))
    AND z.zlovac_full_address IS NOT NULL
    AND zff.zff_full_address IS NOT NULL
    AND TRIM(z.zlovac_full_address) != ''
    AND TRIM(zff.zff_full_address) != '' 