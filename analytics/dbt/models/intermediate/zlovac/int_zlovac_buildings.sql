-- int_zlovac_buildings.sql
-- Gold Buildings table for LOVAC 2026.
-- Maps to Table Buildings_26 specification from the LOVAC documentation.
-- Provides one row per building (ff_idbat) with RNB enrichment.

SELECT DISTINCT
    building_id,
    rnb_id,
    rnb_id_score,
    rnb_emp as rnb_footprint
FROM {{ ref ('int_zlovac') }}
WHERE building_id IS NOT NULL
