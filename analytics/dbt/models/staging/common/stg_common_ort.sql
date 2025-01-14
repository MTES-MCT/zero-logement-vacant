SELECT
    "Code commune" AS geo_code,
    "Signée ?" AS signed,
    "Si signée, date de signature" AS signed_at
FROM {{ ref ('ort') }}
