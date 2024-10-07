SELECT "Code commune" as geo_code, "Signée ?" as signed, "Si signée, date de signature" as signed_at
FROM {{ ref('ort')}}
