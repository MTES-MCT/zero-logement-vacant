-- Test: Vérifier l'ordre chronologique des dates de campagne
-- Ordre attendu: created_at < validated_at < confirmed_at < sent_at
-- Note: Données historiques peuvent avoir des incohérences

{{ config(severity='warn', warn_if='>100', error_if='>2000') }}

SELECT 
    campaign_id, 
    created_at,
    validated_at,
    confirmed_at,
    sent_at,
    'Dates campagne incohérentes: created > validated' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE validated_at IS NOT NULL 
  AND created_at > validated_at

UNION ALL

SELECT 
    campaign_id, 
    created_at,
    validated_at,
    confirmed_at,
    sent_at,
    'Dates campagne incohérentes: validated > confirmed' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE confirmed_at IS NOT NULL 
  AND validated_at IS NOT NULL 
  AND validated_at > confirmed_at

UNION ALL

SELECT 
    campaign_id, 
    created_at,
    validated_at,
    confirmed_at,
    sent_at,
    'Dates campagne incohérentes: confirmed > sent' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE sent_at IS NOT NULL 
  AND confirmed_at IS NOT NULL 
  AND confirmed_at > sent_at
