-- Test: Vérifier que les taux de retour sont entre 0 et 100%
-- Les taux de retour sont calculés pour 3, 6, 9 et 36 mois après l'envoi

{{ config(severity='warn') }}

SELECT 
    campaign_id, 
    return_rate_3_months, 
    return_rate_6_months,
    return_rate_9_months,
    return_rate_36_months, 
    'Taux de retour hors bornes [0-100]' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE is_sent = 1
  AND (
    return_rate_3_months < 0 OR return_rate_3_months > 100
    OR return_rate_6_months < 0 OR return_rate_6_months > 100
    OR return_rate_9_months < 0 OR return_rate_9_months > 100
    OR return_rate_36_months < 0 OR return_rate_36_months > 100
  )
