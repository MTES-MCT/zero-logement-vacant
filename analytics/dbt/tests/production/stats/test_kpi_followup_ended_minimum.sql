-- Test de régression: Seuil minimum de logements avec suivi terminé
-- Ce test s'assure qu'il y a au moins 20k logements avec "Suivi terminé"
-- (référence: test_marts_housing_has_expected_followup_count.sql existant)

{{ config(severity='warn', warn_if='>0', error_if='>0') }}

WITH kpi_check AS (
    SELECT 
        COUNT(*) as housing_followup_ended
    FROM {{ ref('int_production_housing_last_status') }}
    WHERE last_event_status_label_user_followup = 'Suivi terminé'
)
SELECT 
    housing_followup_ended,
    'KPI Suivi terminé en dessous du seuil: ' || housing_followup_ended || ' < 20000' as issue
FROM kpi_check
WHERE housing_followup_ended < 20000
