-- Test: Vérifier que les campagnes envoyées ont des logements
-- Une campagne envoyée (is_sent = 1) doit avoir au moins un logement ciblé

SELECT 
    campaign_id, 
    housing_number_in_campaign, 
    'Campagne envoyée sans logement' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE is_sent = 1 
  AND (housing_number_in_campaign IS NULL OR housing_number_in_campaign = 0)
