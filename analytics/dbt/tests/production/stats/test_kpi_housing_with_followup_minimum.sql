-- Test de régression: Seuil minimum de logements avec suivi utilisateur
-- Ce test s'assure qu'il y a au moins 100k logements avec un statut de suivi utilisateur
-- Une chute en dessous de ce seuil indiquerait un problème dans le pipeline des événements

{{ config(severity='error', error_if='>0') }}

WITH kpi_check AS (
    SELECT 
        COUNT(*) as housing_with_user_followup
    FROM {{ ref('int_production_housing_last_status') }}
    WHERE last_event_status_user_followup IS NOT NULL
)
SELECT 
    housing_with_user_followup,
    'KPI en dessous du seuil minimum: ' || housing_with_user_followup || ' < 100000' as issue
FROM kpi_check
WHERE housing_with_user_followup < 100000
