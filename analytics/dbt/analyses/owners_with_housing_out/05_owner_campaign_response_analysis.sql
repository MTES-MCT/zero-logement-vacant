-- =====================================================
-- OWNER CAMPAIGN RESPONSE ANALYSIS
-- Owner Proactivity and Response to ZLV Campaigns
-- =====================================================

-- 1. Campaign Response Rate by Owner Characteristics
-- Chart: Bar chart showing response rates by owner demographics
WITH owner_campaign_response AS (
  SELECT 
    oho.owner_id,
    COALESCE(o.kind_class, 'Non renseigné') as owner_type,
    CASE 
      WHEN o.birth_date IS NULL THEN 'Age non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 40 THEN 'Moins de 40 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 40 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 60 THEN '40-59 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 60 THEN '60 ans et plus'
    END as age_group,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    MAX(oho.total_sent) as max_campaigns_received,
    COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) as housing_in_groups,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 2
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  GROUP BY 
    oho.owner_id,
    COALESCE(o.kind_class, 'Non renseigné'),
    CASE 
      WHEN o.birth_date IS NULL THEN 'Age non renseigné'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 40 THEN 'Moins de 40 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 40 
           AND DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) < 60 THEN '40-59 ans'
      WHEN DATE_PART('year', CURRENT_DATE) - DATE_PART('year', o.birth_date) >= 60 THEN '60 ans et plus'
    END
),
response_summary AS (
  SELECT 
    owner_type,
    age_group,
    COUNT(owner_id) as owners_count,
    SUM(total_housing) as total_housing,
    SUM(housing_with_campaigns) as total_housing_with_campaigns,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(pct_housing_with_campaigns), 1) as avg_pct_housing_with_campaigns,
    ROUND(AVG(max_campaigns_received), 1) as avg_max_campaigns
  FROM owner_campaign_response
  GROUP BY owner_type, age_group
  HAVING COUNT(owner_id) >= 10
)
SELECT 
  owner_type,
  age_group,
  owners_count,
  total_housing,
  total_housing_with_campaigns,
  avg_campaigns_per_housing,
  avg_pct_housing_with_campaigns,
  avg_max_campaigns
FROM response_summary
ORDER BY avg_pct_housing_with_campaigns DESC;

-- 2. Campaign Intensity Analysis by Owner Portfolio Size
-- Chart: Line chart showing campaign intensity vs portfolio size
WITH portfolio_campaign_intensity AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as portfolio_size,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    SUM(oho.total_sent) as total_campaigns_received,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    COUNT(CASE WHEN oho.total_sent >= 3 THEN 1 END) as housing_with_multiple_campaigns,
    MAX(oho.total_sent) as max_campaigns_single_housing,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
),
portfolio_categories AS (
  SELECT 
    CASE 
      WHEN portfolio_size = 1 THEN '1 logement'
      WHEN portfolio_size = 2 THEN '2 logements'
      WHEN portfolio_size = 3 THEN '3 logements'
      WHEN portfolio_size >= 4 AND portfolio_size <= 5 THEN '4-5 logements'
      WHEN portfolio_size >= 6 AND portfolio_size <= 10 THEN '6-10 logements'
      WHEN portfolio_size > 10 THEN '10+ logements'
    END as portfolio_category,
    COUNT(owner_id) as owners_count,
    SUM(portfolio_size) as total_housing,
    SUM(housing_with_campaigns) as total_housing_with_campaigns,
    SUM(total_campaigns_received) as total_campaigns_sent,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(pct_housing_with_campaigns), 1) as avg_pct_housing_with_campaigns,
    ROUND(AVG(max_campaigns_single_housing), 1) as avg_max_campaigns_single_housing
  FROM portfolio_campaign_intensity
  GROUP BY 
    CASE 
      WHEN portfolio_size = 1 THEN '1 logement'
      WHEN portfolio_size = 2 THEN '2 logements'
      WHEN portfolio_size = 3 THEN '3 logements'
      WHEN portfolio_size >= 4 AND portfolio_size <= 5 THEN '4-5 logements'
      WHEN portfolio_size >= 6 AND portfolio_size <= 10 THEN '6-10 logements'
      WHEN portfolio_size > 10 THEN '10+ logements'
    END
)
SELECT 
  portfolio_category,
  owners_count,
  total_housing,
  total_housing_with_campaigns,
  total_campaigns_sent,
  avg_campaigns_per_housing,
  avg_pct_housing_with_campaigns,
  avg_max_campaigns_single_housing
FROM portfolio_categories
ORDER BY 
  CASE portfolio_category
    WHEN '1 logement' THEN 1
    WHEN '2 logements' THEN 2
    WHEN '3 logements' THEN 3
    WHEN '4-5 logements' THEN 4
    WHEN '6-10 logements' THEN 5
    WHEN '10+ logements' THEN 6
  END;

-- 3. Campaign Timeline and Owner Response Patterns
-- Chart: Timeline showing when owners first received campaigns
WITH owner_campaign_timeline AS (
  SELECT 
    oho.owner_id,
    MIN(oho.first_campaign_sent) as first_campaign_date,
    MAX(oho.last_campaign_sent) as last_campaign_date,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.first_campaign_sent IS NOT NULL THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    DATE_PART('days', MAX(oho.last_campaign_sent) - MIN(oho.first_campaign_sent)) as campaign_span_days
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  WHERE oho.first_campaign_sent IS NOT NULL
  GROUP BY oho.owner_id
),
timeline_analysis AS (
  SELECT 
    CASE 
      WHEN first_campaign_date >= '2024-01-01' THEN '2024'
      WHEN first_campaign_date >= '2023-01-01' AND first_campaign_date < '2024-01-01' THEN '2023'
      WHEN first_campaign_date >= '2022-01-01' AND first_campaign_date < '2023-01-01' THEN '2022'
      WHEN first_campaign_date >= '2021-01-01' AND first_campaign_date < '2022-01-01' THEN '2021'
      WHEN first_campaign_date < '2021-01-01' THEN 'Avant 2021'
    END as first_campaign_year,
    CASE 
      WHEN campaign_span_days IS NULL THEN 'Campagne unique'
      WHEN campaign_span_days = 0 THEN 'Campagne unique'
      WHEN campaign_span_days <= 30 THEN 'Campagnes sur 1 mois'
      WHEN campaign_span_days <= 90 THEN 'Campagnes sur 3 mois'
      WHEN campaign_span_days <= 365 THEN 'Campagnes sur 1 an'
      WHEN campaign_span_days > 365 THEN 'Campagnes sur plusieurs années'
    END as campaign_duration_category,
    COUNT(owner_id) as owners_count,
    SUM(total_housing) as total_housing,
    SUM(housing_with_campaigns) as total_housing_with_campaigns,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(campaign_span_days), 0) as avg_campaign_span_days
  FROM owner_campaign_timeline
  GROUP BY 
    CASE 
      WHEN first_campaign_date >= '2024-01-01' THEN '2024'
      WHEN first_campaign_date >= '2023-01-01' AND first_campaign_date < '2024-01-01' THEN '2023'
      WHEN first_campaign_date >= '2022-01-01' AND first_campaign_date < '2023-01-01' THEN '2022'
      WHEN first_campaign_date >= '2021-01-01' AND first_campaign_date < '2022-01-01' THEN '2021'
      WHEN first_campaign_date < '2021-01-01' THEN 'Avant 2021'
    END,
    CASE 
      WHEN campaign_span_days IS NULL THEN 'Campagne unique'
      WHEN campaign_span_days = 0 THEN 'Campagne unique'
      WHEN campaign_span_days <= 30 THEN 'Campagnes sur 1 mois'
      WHEN campaign_span_days <= 90 THEN 'Campagnes sur 3 mois'
      WHEN campaign_span_days <= 365 THEN 'Campagnes sur 1 an'
      WHEN campaign_span_days > 365 THEN 'Campagnes sur plusieurs années'
    END
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  first_campaign_year,
  campaign_duration_category,
  owners_count,
  total_housing,
  total_housing_with_campaigns,
  avg_campaigns_per_housing,
  avg_campaign_span_days
FROM timeline_analysis
ORDER BY 
  CASE first_campaign_year
    WHEN 'Avant 2021' THEN 1
    WHEN '2021' THEN 2
    WHEN '2022' THEN 3
    WHEN '2023' THEN 4
    WHEN '2024' THEN 5
  END,
  owners_count DESC;

-- 4. Owner Location vs Campaign Participation
-- Chart: Heatmap showing campaign participation by owner location
WITH location_campaign_participation AS (
  SELECT 
    oho.owner_id,
    o.city as owner_city,
    LEFT(o.postal_code, 2) as owner_department,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.postal_code IS NOT NULL
  GROUP BY oho.owner_id, o.city, LEFT(o.postal_code, 2)
),
department_summary AS (
  SELECT 
    owner_department,
    COUNT(owner_id) as owners_count,
    SUM(total_housing) as total_housing,
    SUM(housing_with_campaigns) as total_housing_with_campaigns,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(pct_housing_with_campaigns), 1) as avg_pct_housing_with_campaigns,
    ROUND(
      SUM(housing_with_campaigns) * 100.0 / 
      NULLIF(SUM(total_housing), 0), 1
    ) as overall_pct_housing_with_campaigns
  FROM location_campaign_participation
  GROUP BY owner_department
  HAVING COUNT(owner_id) >= 20
)
SELECT 
  owner_department,
  owners_count,
  total_housing,
  total_housing_with_campaigns,
  avg_campaigns_per_housing,
  avg_pct_housing_with_campaigns,
  overall_pct_housing_with_campaigns,
  ROW_NUMBER() OVER (ORDER BY overall_pct_housing_with_campaigns DESC) as department_rank
FROM department_summary
ORDER BY overall_pct_housing_with_campaigns DESC;

-- 5. Establishment Activity and Owner Response
-- Chart: Scatter plot showing establishment activity vs owner campaign participation
WITH establishment_owner_response AS (
  SELECT 
    oho.owner_id,
    oho.establishment_ids_array,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) as housing_in_groups,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id, oho.establishment_ids_array
),
establishment_activity_levels AS (
  SELECT 
    eor.owner_id,
    eor.total_housing,
    eor.housing_with_campaigns,
    eor.avg_campaigns_per_housing,
    eor.pct_housing_with_campaigns,
    COALESCE(ea.typologie_activation_simple, 'Non rattaché') as establishment_activity_level,
    COALESCE(ea.type_regroupe, 'Non rattaché') as establishment_type
  FROM establishment_owner_response eor
  LEFT JOIN dwh.main_marts.marts_production_establishments e ON eor.establishment_ids_array @> ARRAY[e.establishment_id]
  LEFT JOIN dwh.main_marts.marts_production_establishments_activation ea ON e.establishment_id = ea.establishment_id
)
SELECT 
  establishment_activity_level,
  establishment_type,
  COUNT(owner_id) as owners_count,
  SUM(total_housing) as total_housing,
  SUM(housing_with_campaigns) as total_housing_with_campaigns,
  ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
  ROUND(AVG(pct_housing_with_campaigns), 1) as avg_pct_housing_with_campaigns,
  ROUND(
    SUM(housing_with_campaigns) * 100.0 / 
    NULLIF(SUM(total_housing), 0), 1
  ) as overall_pct_housing_with_campaigns
FROM establishment_activity_levels
GROUP BY establishment_activity_level, establishment_type
HAVING COUNT(owner_id) >= 10
ORDER BY overall_pct_housing_with_campaigns DESC;

-- 6. Multi-Housing Owner Campaign Coordination
-- Chart: Bar chart showing campaign coordination across owner's portfolio
WITH multi_housing_coordination AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    COUNT(DISTINCT oho.first_campaign_sent) as distinct_campaign_dates,
    MIN(oho.first_campaign_sent) as first_campaign_date,
    MAX(oho.last_campaign_sent) as last_campaign_date,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    STDDEV(oho.total_sent) as campaigns_stddev,
    CASE 
      WHEN COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) = 0 THEN 'Aucune campagne'
      WHEN COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) = COUNT(oho.housing_id) THEN 'Tous les logements contactés'
      ELSE 'Contacté partiellement'
    END as campaign_coverage
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
  HAVING COUNT(oho.housing_id) >= 2  -- Focus on multi-housing owners
),
coordination_analysis AS (
  SELECT 
    CASE 
      WHEN total_housing = 2 THEN '2 logements'
      WHEN total_housing = 3 THEN '3 logements'
      WHEN total_housing >= 4 AND total_housing <= 5 THEN '4-5 logements'
      WHEN total_housing > 5 THEN '5+ logements'
    END as portfolio_size,
    campaign_coverage,
    COUNT(owner_id) as owners_count,
    ROUND(AVG(total_housing), 1) as avg_total_housing,
    ROUND(AVG(housing_with_campaigns), 1) as avg_housing_with_campaigns,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(distinct_campaign_dates), 1) as avg_distinct_campaign_dates,
    ROUND(
      AVG(housing_with_campaigns * 100.0 / total_housing), 1
    ) as avg_pct_housing_with_campaigns
  FROM multi_housing_coordination
  GROUP BY 
    CASE 
      WHEN total_housing = 2 THEN '2 logements'
      WHEN total_housing = 3 THEN '3 logements'
      WHEN total_housing >= 4 AND total_housing <= 5 THEN '4-5 logements'
      WHEN total_housing > 5 THEN '5+ logements'
    END,
    campaign_coverage
  HAVING COUNT(owner_id) >= 5
)
SELECT 
  portfolio_size,
  campaign_coverage,
  owners_count,
  avg_total_housing,
  avg_housing_with_campaigns,
  avg_campaigns_per_housing,
  avg_distinct_campaign_dates,
  avg_pct_housing_with_campaigns
FROM coordination_analysis
ORDER BY 
  CASE portfolio_size
    WHEN '2 logements' THEN 1
    WHEN '3 logements' THEN 2
    WHEN '4-5 logements' THEN 3
    WHEN '5+ logements' THEN 4
  END,
  avg_pct_housing_with_campaigns DESC;

-- 7. Owner Responsiveness Score
-- Chart: Histogram showing owner responsiveness distribution
WITH owner_responsiveness AS (
  SELECT 
    oho.owner_id,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) as housing_in_groups,
    -- Create responsiveness score based on multiple factors
    (COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(oho.housing_id), 0)) * 0.4 +  -- Campaign participation weight
    (LEAST(ROUND(AVG(oho.total_sent), 1), 5) * 10) * 0.3 +  -- Campaign intensity weight (capped at 5)
    (COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(oho.housing_id), 0)) * 0.3   -- Group participation weight
    as responsiveness_score
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
),
responsiveness_categories AS (
  SELECT 
    CASE 
      WHEN responsiveness_score < 20 THEN 'Très faible (0-19)'
      WHEN responsiveness_score >= 20 AND responsiveness_score < 40 THEN 'Faible (20-39)'
      WHEN responsiveness_score >= 40 AND responsiveness_score < 60 THEN 'Modérée (40-59)'
      WHEN responsiveness_score >= 60 AND responsiveness_score < 80 THEN 'Élevée (60-79)'
      WHEN responsiveness_score >= 80 THEN 'Très élevée (80+)'
    END as responsiveness_category,
    COUNT(owner_id) as owners_count,
    SUM(total_housing) as total_housing,
    SUM(housing_with_campaigns) as total_housing_with_campaigns,
    ROUND(AVG(avg_campaigns_per_housing), 1) as avg_campaigns_per_housing,
    ROUND(AVG(responsiveness_score), 1) as avg_responsiveness_score,
    ROUND(AVG(total_housing), 1) as avg_portfolio_size
  FROM owner_responsiveness
  GROUP BY 
    CASE 
      WHEN responsiveness_score < 20 THEN 'Très faible (0-19)'
      WHEN responsiveness_score >= 20 AND responsiveness_score < 40 THEN 'Faible (20-39)'
      WHEN responsiveness_score >= 40 AND responsiveness_score < 60 THEN 'Modérée (40-59)'
      WHEN responsiveness_score >= 60 AND responsiveness_score < 80 THEN 'Élevée (60-79)'
      WHEN responsiveness_score >= 80 THEN 'Très élevée (80+)'
    END
)
SELECT 
  responsiveness_category,
  owners_count,
  total_housing,
  total_housing_with_campaigns,
  avg_campaigns_per_housing,
  avg_responsiveness_score,
  avg_portfolio_size
FROM responsiveness_categories
ORDER BY avg_responsiveness_score;

-- 8. Top Responsive Owners Analysis
-- Chart: Table showing most responsive owners and their characteristics
WITH top_responsive_owners AS (
  SELECT 
    oho.owner_id,
    o.kind_class as owner_type,
    COUNT(oho.housing_id) as total_housing,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_per_housing,
    SUM(oho.total_sent) as total_campaigns_received,
    COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) as housing_in_groups,
    COUNT(DISTINCT oho.geo_code) as cities_count,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 1
    ) as pct_housing_with_campaigns,
    -- Responsiveness score
    (COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(oho.housing_id), 0)) * 0.4 +
    (LEAST(ROUND(AVG(oho.total_sent), 1), 5) * 10) * 0.3 +
    (COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(oho.housing_id), 0)) * 0.3 
    as responsiveness_score
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  GROUP BY oho.owner_id, o.kind_class
  HAVING COUNT(oho.housing_id) >= 2  -- Focus on owners with multiple housing
)
SELECT 
  owner_id,
  owner_type,
  total_housing,
  housing_with_campaigns,
  avg_campaigns_per_housing,
  total_campaigns_received,
  housing_in_groups,
  cities_count,
  pct_housing_with_campaigns,
  ROUND(responsiveness_score, 1) as responsiveness_score,
  ROW_NUMBER() OVER (ORDER BY responsiveness_score DESC) as responsiveness_rank
FROM top_responsive_owners
ORDER BY responsiveness_score DESC
LIMIT 100;

