-- =====================================================
-- OWNER CONTACT INFORMATION ANALYSIS
-- Contact Information Availability and Impact on Campaign Success
-- =====================================================

-- 1. Contact Information Completeness Analysis
-- Chart: Stacked bar chart showing contact info availability
WITH contact_completeness AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    o.email IS NOT NULL AND o.email != '' as has_email,
    o.phone IS NOT NULL AND o.phone != '' as has_phone,
    o.additional_address IS NOT NULL AND o.additional_address != '' as has_additional_address,
    CASE 
      WHEN (o.email IS NOT NULL AND o.email != '') AND (o.phone IS NOT NULL AND o.phone != '') THEN 'Email + Téléphone'
      WHEN (o.email IS NOT NULL AND o.email != '') THEN 'Email seulement'
      WHEN (o.phone IS NOT NULL AND o.phone != '') THEN 'Téléphone seulement'
      ELSE 'Aucun contact'
    END as contact_availability,
    oho.total_sent,
    oho.total_groups,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
),
contact_summary AS (
  SELECT 
    contact_availability,
    COUNT(DISTINCT owner_id) as owners_count,
    COUNT(housing_id) as housing_count,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
      NULLIF(COUNT(housing_id), 0), 2
    ) as pct_housing_with_campaigns,
    SUM(CASE WHEN has_email THEN 1 ELSE 0 END) as owners_with_email,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) as owners_with_phone,
    SUM(CASE WHEN has_additional_address THEN 1 ELSE 0 END) as owners_with_additional_address
  FROM contact_completeness
  GROUP BY contact_availability
)
SELECT 
  contact_availability,
  owners_count,
  housing_count,
  avg_campaigns_sent,
  housing_with_campaigns,
  pct_housing_with_campaigns,
  owners_with_email,
  owners_with_phone,
  owners_with_additional_address
FROM contact_summary
ORDER BY 
  CASE contact_availability
    WHEN 'Email + Téléphone' THEN 1
    WHEN 'Email seulement' THEN 2
    WHEN 'Téléphone seulement' THEN 3
    WHEN 'Aucun contact' THEN 4
  END;

-- 2. Email Domain Analysis
-- Chart: Bar chart showing most common email domains
WITH email_domains AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN o.email IS NULL OR o.email = '' THEN 'Pas d''email'
      WHEN o.email LIKE '%@gmail.%' THEN 'Gmail'
      WHEN o.email LIKE '%@yahoo.%' THEN 'Yahoo'
      WHEN o.email LIKE '%@hotmail.%' OR o.email LIKE '%@outlook.%' OR o.email LIKE '%@live.%' THEN 'Microsoft (Hotmail/Outlook)'
      WHEN o.email LIKE '%@orange.%' OR o.email LIKE '%@wanadoo.%' THEN 'Orange/Wanadoo'
      WHEN o.email LIKE '%@free.%' THEN 'Free'
      WHEN o.email LIKE '%@sfr.%' THEN 'SFR'
      WHEN o.email LIKE '%@laposte.%' THEN 'La Poste'
      ELSE 'Autres domaines'
    END as email_domain_category,
    SUBSTRING(o.email FROM '@(.*)$') as email_domain_exact,
    oho.total_sent,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
),
domain_analysis AS (
  SELECT 
    email_domain_category,
    COUNT(DISTINCT owner_id) as owners_count,
    COUNT(housing_id) as housing_count,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
      NULLIF(COUNT(housing_id), 0), 2
    ) as pct_housing_with_campaigns
  FROM email_domains
  GROUP BY email_domain_category
)
SELECT 
  email_domain_category,
  owners_count,
  housing_count,
  avg_campaigns_sent,
  housing_with_campaigns,
  pct_housing_with_campaigns
FROM domain_analysis
ORDER BY owners_count DESC;

-- 3. Phone Number Analysis
-- Chart: Bar chart showing phone number patterns and campaign effectiveness
WITH phone_analysis AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN o.phone IS NULL OR o.phone = '' THEN 'Pas de téléphone'
      WHEN o.phone LIKE '01%' THEN 'Fixe Île-de-France (01)'
      WHEN o.phone LIKE '02%' THEN 'Fixe Nord-Ouest (02)'
      WHEN o.phone LIKE '03%' THEN 'Fixe Nord-Est (03)'
      WHEN o.phone LIKE '04%' THEN 'Fixe Sud-Est (04)'
      WHEN o.phone LIKE '05%' THEN 'Fixe Sud-Ouest (05)'
      WHEN o.phone LIKE '06%' OR o.phone LIKE '07%' THEN 'Mobile (06/07)'
      WHEN o.phone LIKE '08%' THEN 'Numéro spécial (08)'
      WHEN o.phone LIKE '09%' THEN 'Numéro non géographique (09)'
      ELSE 'Format non standard'
    END as phone_type,
    LENGTH(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g')) as phone_digits_count,
    oho.total_sent,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
),
phone_summary AS (
  SELECT 
    phone_type,
    COUNT(DISTINCT owner_id) as owners_count,
    COUNT(housing_id) as housing_count,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
      NULLIF(COUNT(housing_id), 0), 2
    ) as pct_housing_with_campaigns,
    ROUND(AVG(phone_digits_count), 1) as avg_phone_digits
  FROM phone_analysis
  GROUP BY phone_type
)
SELECT 
  phone_type,
  owners_count,
  housing_count,
  avg_campaigns_sent,
  housing_with_campaigns,
  pct_housing_with_campaigns,
  avg_phone_digits
FROM phone_summary
ORDER BY owners_count DESC;

-- 4. Additional Address Information Analysis
-- Chart: Bar chart showing impact of additional address information
WITH additional_address_analysis AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN o.additional_address IS NULL OR o.additional_address = '' THEN 'Pas d''adresse complémentaire'
      WHEN LENGTH(o.additional_address) <= 20 THEN 'Adresse courte (≤20 car.)'
      WHEN LENGTH(o.additional_address) > 20 AND LENGTH(o.additional_address) <= 50 THEN 'Adresse moyenne (21-50 car.)'
      WHEN LENGTH(o.additional_address) > 50 THEN 'Adresse détaillée (>50 car.)'
    END as additional_address_category,
    LENGTH(COALESCE(o.additional_address, '')) as additional_address_length,
    oho.total_sent,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
)
SELECT 
  additional_address_category,
  COUNT(DISTINCT owner_id) as owners_count,
  COUNT(housing_id) as housing_count,
  ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
  COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
  ROUND(
    COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
    NULLIF(COUNT(housing_id), 0), 2
  ) as pct_housing_with_campaigns,
  ROUND(AVG(additional_address_length), 1) as avg_address_length
FROM additional_address_analysis
GROUP BY additional_address_category
ORDER BY 
  CASE additional_address_category
    WHEN 'Adresse détaillée (>50 car.)' THEN 1
    WHEN 'Adresse moyenne (21-50 car.)' THEN 2
    WHEN 'Adresse courte (≤20 car.)' THEN 3
    WHEN 'Pas d''adresse complémentaire' THEN 4
  END;

-- 5. Contact Quality Score Analysis
-- Chart: Scatter plot showing contact quality vs campaign effectiveness
WITH contact_quality_score AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    -- Create a contact quality score
    (CASE WHEN o.email IS NOT NULL AND o.email != '' THEN 2 ELSE 0 END) +
    (CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN 2 ELSE 0 END) +
    (CASE WHEN o.additional_address IS NOT NULL AND o.additional_address != '' THEN 1 ELSE 0 END) +
    (CASE WHEN o.street_address IS NOT NULL AND o.street_address != '' THEN 1 ELSE 0 END) +
    (CASE WHEN o.city IS NOT NULL AND o.city != '' THEN 1 ELSE 0 END) +
    (CASE WHEN o.postal_code IS NOT NULL AND o.postal_code != '' THEN 1 ELSE 0 END) as contact_quality_score,
    oho.total_sent,
    oho.total_groups,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
),
quality_categories AS (
  SELECT 
    CASE 
      WHEN contact_quality_score <= 2 THEN 'Qualité faible (0-2)'
      WHEN contact_quality_score = 3 THEN 'Qualité modérée (3)'
      WHEN contact_quality_score = 4 THEN 'Qualité bonne (4)'
      WHEN contact_quality_score >= 5 THEN 'Qualité excellente (5+)'
    END as quality_category,
    COUNT(DISTINCT owner_id) as owners_count,
    COUNT(housing_id) as housing_count,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    ROUND(AVG(total_groups), 1) as avg_groups,
    COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
      NULLIF(COUNT(housing_id), 0), 2
    ) as pct_housing_with_campaigns,
    ROUND(AVG(contact_quality_score), 1) as avg_quality_score
  FROM contact_quality_score
  GROUP BY 
    CASE 
      WHEN contact_quality_score <= 2 THEN 'Qualité faible (0-2)'
      WHEN contact_quality_score = 3 THEN 'Qualité modérée (3)'
      WHEN contact_quality_score = 4 THEN 'Qualité bonne (4)'
      WHEN contact_quality_score >= 5 THEN 'Qualité excellente (5+)'
    END
)
SELECT 
  quality_category,
  owners_count,
  housing_count,
  avg_campaigns_sent,
  avg_groups,
  housing_with_campaigns,
  pct_housing_with_campaigns,
  avg_quality_score
FROM quality_categories
ORDER BY avg_quality_score;

-- 6. Contact Information by Owner Type
-- Chart: Heatmap showing contact availability by owner type
WITH contact_by_owner_type AS (
  SELECT 
    COALESCE(o.kind_class, 'Non renseigné') as owner_type,
    COUNT(DISTINCT oho.owner_id) as owners_count,
    COUNT(oho.housing_id) as housing_count,
    SUM(CASE WHEN o.email IS NOT NULL AND o.email != '' THEN 1 ELSE 0 END) as owners_with_email,
    SUM(CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN 1 ELSE 0 END) as owners_with_phone,
    SUM(CASE WHEN (o.email IS NOT NULL AND o.email != '') AND (o.phone IS NOT NULL AND o.phone != '') THEN 1 ELSE 0 END) as owners_with_both,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    ROUND(
      SUM(CASE WHEN o.email IS NOT NULL AND o.email != '' THEN 1 ELSE 0 END) * 100.0 / 
      NULLIF(COUNT(DISTINCT oho.owner_id), 0), 1
    ) as pct_owners_with_email,
    ROUND(
      SUM(CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN 1 ELSE 0 END) * 100.0 / 
      NULLIF(COUNT(DISTINCT oho.owner_id), 0), 1
    ) as pct_owners_with_phone
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  GROUP BY COALESCE(o.kind_class, 'Non renseigné')
  HAVING COUNT(DISTINCT oho.owner_id) >= 10
)
SELECT 
  owner_type,
  owners_count,
  housing_count,
  owners_with_email,
  owners_with_phone,
  owners_with_both,
  pct_owners_with_email,
  pct_owners_with_phone,
  avg_campaigns_sent
FROM contact_by_owner_type
ORDER BY owners_count DESC;

-- 7. Missing Contact Information Impact
-- Chart: Bar chart showing campaign limitations due to missing contact info
WITH missing_contact_impact AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN (o.email IS NULL OR o.email = '') AND (o.phone IS NULL OR o.phone = '') THEN 'Aucun contact électronique'
      WHEN (o.email IS NULL OR o.email = '') THEN 'Email manquant'
      WHEN (o.phone IS NULL OR o.phone = '') THEN 'Téléphone manquant'
      ELSE 'Contact complet'
    END as contact_gap,
    CASE 
      WHEN o.street_address IS NULL OR o.street_address = '' THEN 'Adresse incomplète'
      ELSE 'Adresse complète'
    END as address_completeness,
    oho.total_sent,
    oho.total_groups,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
)
SELECT 
  contact_gap,
  address_completeness,
  COUNT(DISTINCT owner_id) as owners_count,
  COUNT(housing_id) as housing_count,
  ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
  COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
  ROUND(
    COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
    NULLIF(COUNT(housing_id), 0), 2
  ) as pct_housing_with_campaigns,
  -- Potential improvement if contact info was complete
  ROUND(
    COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
    NULLIF(COUNT(housing_id), 0), 2
  ) as current_campaign_rate
FROM missing_contact_impact
GROUP BY contact_gap, address_completeness
ORDER BY owners_count DESC;

-- 8. Contact Information Trends Over Time
-- Chart: Timeline showing contact information completeness evolution
WITH contact_trends AS (
  SELECT 
    CASE 
      WHEN o.created_at IS NULL THEN 'Non renseigné'
      WHEN o.created_at >= '2024-01-01' THEN '2024'
      WHEN o.created_at >= '2023-01-01' AND o.created_at < '2024-01-01' THEN '2023'
      WHEN o.created_at >= '2022-01-01' AND o.created_at < '2023-01-01' THEN '2022'
      WHEN o.created_at >= '2021-01-01' AND o.created_at < '2022-01-01' THEN '2021'
      WHEN o.created_at < '2021-01-01' THEN 'Avant 2021'
    END as creation_period,
    COUNT(DISTINCT oho.owner_id) as owners_count,
    COUNT(oho.housing_id) as housing_count,
    SUM(CASE WHEN o.email IS NOT NULL AND o.email != '' THEN 1 ELSE 0 END) as owners_with_email,
    SUM(CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN 1 ELSE 0 END) as owners_with_phone,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    ROUND(
      SUM(CASE WHEN o.email IS NOT NULL AND o.email != '' THEN 1 ELSE 0 END) * 100.0 / 
      NULLIF(COUNT(DISTINCT oho.owner_id), 0), 1
    ) as pct_owners_with_email,
    ROUND(
      SUM(CASE WHEN o.phone IS NOT NULL AND o.phone != '' THEN 1 ELSE 0 END) * 100.0 / 
      NULLIF(COUNT(DISTINCT oho.owner_id), 0), 1
    ) as pct_owners_with_phone
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  GROUP BY 
    CASE 
      WHEN o.created_at IS NULL THEN 'Non renseigné'
      WHEN o.created_at >= '2024-01-01' THEN '2024'
      WHEN o.created_at >= '2023-01-01' AND o.created_at < '2024-01-01' THEN '2023'
      WHEN o.created_at >= '2022-01-01' AND o.created_at < '2023-01-01' THEN '2022'
      WHEN o.created_at >= '2021-01-01' AND o.created_at < '2022-01-01' THEN '2021'
      WHEN o.created_at < '2021-01-01' THEN 'Avant 2021'
    END
  HAVING COUNT(DISTINCT oho.owner_id) >= 50
)
SELECT 
  creation_period,
  owners_count,
  housing_count,
  owners_with_email,
  owners_with_phone,
  pct_owners_with_email,
  pct_owners_with_phone,
  avg_campaigns_sent
FROM contact_trends
ORDER BY 
  CASE creation_period
    WHEN 'Non renseigné' THEN 0
    WHEN 'Avant 2021' THEN 1
    WHEN '2021' THEN 2
    WHEN '2022' THEN 3
    WHEN '2023' THEN 4
    WHEN '2024' THEN 5
  END;

