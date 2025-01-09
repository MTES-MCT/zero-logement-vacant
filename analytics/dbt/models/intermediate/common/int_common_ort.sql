SELECT
    geo_code,
    CASE WHEN signed = 'Signée' THEN TRUE ELSE FALSE END AS signed,
    signed_at
FROM {{ ref ('stg_common_ort') }}
