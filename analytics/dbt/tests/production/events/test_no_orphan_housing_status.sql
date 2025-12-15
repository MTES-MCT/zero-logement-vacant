-- Test: Vérifier l'intégrité référentielle pour les événements de CHANGEMENT DE STATUT
-- 
-- Contexte: Il existe ~2500 orphelins historiques (2020-2023) qui sont :
--   - Des notes informatives (pas des changements de statut)
--   - Liés à des logements supprimés depuis
-- Ces orphelins n'affectent pas les KPIs car ils ont type=NULL.
--
-- Ce test se concentre uniquement sur les événements IMPORTANTS (avec un type)
-- qui devraient avoir un logement existant.

{{ config(severity='warn', warn_if='>50', error_if='>200') }}

SELECT 
    e.id as event_id,
    e.housing_id,
    e.type,
    e.version,
    e.created_at,
    'Événement de changement de statut avec housing_id inexistant' as issue
FROM {{ ref('int_production_events') }} e
LEFT JOIN {{ ref('int_production_housing') }} h ON e.housing_id = h.id
WHERE h.id IS NULL
AND e.housing_id IS NOT NULL
AND e.type IS NOT NULL  -- Uniquement les événements avec un type (changements de statut)

