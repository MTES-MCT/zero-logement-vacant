WITH first_address AS (
    SELECT 
        po.*,
        raw_address[1] AS address_element
    FROM 
        {{ ref('stg_production_owners') }} po
),
cleaned_addresses AS (
    SELECT 
        fa.*, 
        regexp_replace(fa.address_element, '^\{|\}$', '') AS cleaned_address
    FROM 
        first_address fa
), split_addresses AS (
    SELECT
        ca.*,
        regexp_extract(ca.cleaned_address, '\d{5}', 0) AS postal_code,
        regexp_extract(ca.cleaned_address, '[^\d\{]*$', 0) AS city,
        regexp_extract(ca.cleaned_address, '^[^{]*', 0) AS street_address
    FROM 
        cleaned_addresses ca
)
SELECT
    *
FROM 
    split_addresses
 