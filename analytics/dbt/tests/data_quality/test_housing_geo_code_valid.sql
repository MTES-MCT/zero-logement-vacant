-- Test: Vérifier que les codes INSEE (geo_code) sont valides
-- Format attendu: 5 caractères (2 chiffres département + 3 chiffres commune)
-- ou 5 caractères pour DOM-TOM (97x + 2 chiffres)

{{ config(severity='warn', warn_if='>100', error_if='>1000') }}

SELECT 
    housing_id, 
    geo_code, 
    'Code INSEE invalide (doit avoir 5 caractères)' as issue
FROM {{ ref('marts_production_housing') }}
WHERE geo_code IS NOT NULL 
  AND LENGTH(geo_code) != 5
