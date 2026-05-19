-- Test: int_zlovac_housing latitude/longitude within France + DOM-TOM bounds.
-- Metropolitan France + DOM-TOM (Mayotte ~-13/45, Reunion ~-21/55, Guyane ~5/-52, Antilles ~16/-61).
-- Bounds widened a bit to allow Saint-Pierre-et-Miquelon (~47/-56).

{{ config(severity='error', error_if='>0') }}

SELECT
    local_id,
    latitude_dgfip,
    longitude_dgfip,
    'latitude/longitude out of France + DOM-TOM bounds' as issue
FROM {{ ref('int_zlovac_housing') }}
WHERE (latitude_dgfip IS NOT NULL AND (latitude_dgfip < -22 OR latitude_dgfip > 52))
   OR (longitude_dgfip IS NOT NULL AND (longitude_dgfip < -62 OR longitude_dgfip > 56))
