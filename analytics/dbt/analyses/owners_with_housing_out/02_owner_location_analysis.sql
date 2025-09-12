-- =====================================================
-- OWNER LOCATION ANALYSIS
-- Owner Location vs Housing Location and Impact on Vacancy Exit
-- =====================================================

-- 1. Owner Geographic Distribution
-- Chart: Map/bar chart showing where owners are located
WITH owner_location_analysis AS (
  SELECT 
    COALESCE(o.city, 'Non renseigné') as owner_city,
    COALESCE(o.postal_code, 'Non renseigné') as owner_postal_code,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(DISTINCT o.owner_id) as total_owners,
    ROUND(
      COUNT(DISTINCT oho.owner_id) * 100.0 / 
      NULLIF(COUNT(DISTINCT o.owner_id), 0), 2
    ) as pct_owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out
  FROM dwh.main_marts.marts_production_owners o
  LEFT JOIN dwh.main_marts.marts_analysis_owners_housing_out oho ON o.owner_id = oho.owner_id
  WHERE o.city IS NOT NULL AND o.city != ''
  GROUP BY COALESCE(o.city, 'Non renseigné'), COALESCE(o.postal_code, 'Non renseigné')
  HAVING COUNT(DISTINCT o.owner_id) >= 10
)
SELECT 
  owner_city,
  owner_postal_code,
  owners_with_housing_out,
  total_owners,
  pct_owners_with_housing_out,
  total_housing_out,
  ROW_NUMBER() OVER (ORDER BY total_owners DESC) as city_rank_by_owners
FROM owner_location_analysis
ORDER BY total_owners DESC
LIMIT 50;

-- 2. Owner vs Housing Location Proximity Analysis
-- Chart: Scatter plot showing distance impact on vacancy exit
WITH owner_housing_proximity AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    o.city as owner_city,
    o.postal_code as owner_postal_code,
    oho.city as housing_city,
    LEFT(oho.geo_code, 2) as housing_department,
    LEFT(o.postal_code, 2) as owner_department,
    CASE 
      WHEN o.city = oho.city THEN 'Même ville'
      WHEN LEFT(o.postal_code, 2) = LEFT(oho.geo_code, 2) THEN 'Même département'
      WHEN LEFT(o.postal_code, 1) = LEFT(oho.geo_code, 1) THEN 'Même région (approximatif)'
      ELSE 'Différente région'
    END as proximity_level,
    oho.total_sent,
    oho.first_campaign_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.city IS NOT NULL AND o.postal_code IS NOT NULL
),
proximity_summary AS (
  SELECT 
    proximity_level,
    COUNT(DISTINCT owner_id) as owners_count,
    COUNT(housing_id) as housing_count,
    ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
    COUNT(CASE WHEN first_campaign_sent IS NOT NULL THEN 1 END) as housing_with_campaigns,
    ROUND(
      COUNT(CASE WHEN first_campaign_sent IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(housing_id), 0), 2
    ) as pct_housing_with_campaigns
  FROM owner_housing_proximity
  GROUP BY proximity_level
)
SELECT 
  proximity_level,
  owners_count,
  housing_count,
  avg_campaigns_sent,
  housing_with_campaigns,
  pct_housing_with_campaigns
FROM proximity_summary
ORDER BY 
  CASE proximity_level
    WHEN 'Même ville' THEN 1
    WHEN 'Même département' THEN 2
    WHEN 'Même région (approximatif)' THEN 3
    WHEN 'Différente région' THEN 4
  END;

-- 3. Local vs Non-Local Owners Analysis
-- Chart: Bar chart comparing local vs non-local owner effectiveness
WITH local_vs_nonlocal AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN o.city = oho.city THEN 'Propriétaire local'
      WHEN LEFT(o.postal_code, 2) = LEFT(oho.geo_code, 2) THEN 'Propriétaire départemental'
      ELSE 'Propriétaire externe'
    END as owner_locality,
    oho.total_sent,
    oho.total_groups,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.postal_code IS NOT NULL AND oho.geo_code IS NOT NULL
)
SELECT 
  owner_locality,
  COUNT(DISTINCT owner_id) as owners_count,
  COUNT(housing_id) as housing_count,
  ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
  ROUND(AVG(total_groups), 1) as avg_groups,
  COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
  ROUND(
    COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
    NULLIF(COUNT(housing_id), 0), 2
  ) as pct_housing_with_campaigns
FROM local_vs_nonlocal
GROUP BY owner_locality
ORDER BY 
  CASE owner_locality
    WHEN 'Propriétaire local' THEN 1
    WHEN 'Propriétaire départemental' THEN 2
    WHEN 'Propriétaire externe' THEN 3
  END;

-- 4. Top Owner Cities Analysis
-- Chart: Horizontal bar chart showing cities with most owners having housing out
WITH top_owner_cities AS (
  SELECT 
    o.city as owner_city,
    o.postal_code as owner_postal_code,
    COUNT(DISTINCT oho.owner_id) as owners_with_housing_out,
    COUNT(oho.housing_id) as total_housing_out,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    COUNT(DISTINCT oho.geo_code) as housing_cities_count,
    STRING_AGG(DISTINCT oho.city, ', ' ORDER BY oho.city) as housing_cities_sample
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.city IS NOT NULL AND o.city != ''
  GROUP BY o.city, o.postal_code
  HAVING COUNT(DISTINCT oho.owner_id) >= 5
)
SELECT 
  owner_city,
  owner_postal_code,
  owners_with_housing_out,
  total_housing_out,
  avg_campaigns_sent,
  housing_cities_count,
  LEFT(housing_cities_sample, 100) as housing_cities_sample_truncated
FROM top_owner_cities
ORDER BY owners_with_housing_out DESC
LIMIT 30;

-- 5. Cross-Regional Ownership Patterns
-- Chart: Heatmap showing owner region vs housing region
WITH regional_patterns AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    LEFT(o.postal_code, 2) as owner_department,
    LEFT(oho.geo_code, 2) as housing_department,
    -- Approximate region mapping (simplified)
    CASE 
      WHEN LEFT(o.postal_code, 2) IN ('75', '77', '78', '91', '92', '93', '94', '95') THEN 'Île-de-France'
      WHEN LEFT(o.postal_code, 2) IN ('13', '83', '84', '04', '05', '06') THEN 'PACA'
      WHEN LEFT(o.postal_code, 2) IN ('69', '01', '07', '26', '38', '42', '73', '74') THEN 'Auvergne-Rhône-Alpes'
      WHEN LEFT(o.postal_code, 2) IN ('33', '24', '40', '47', '64') THEN 'Nouvelle-Aquitaine'
      WHEN LEFT(o.postal_code, 2) IN ('31', '09', '11', '12', '30', '32', '34', '46', '48', '65', '66', '81', '82') THEN 'Occitanie'
      ELSE 'Autres régions'
    END as owner_region,
    CASE 
      WHEN LEFT(oho.geo_code, 2) IN ('75', '77', '78', '91', '92', '93', '94', '95') THEN 'Île-de-France'
      WHEN LEFT(oho.geo_code, 2) IN ('13', '83', '84', '04', '05', '06') THEN 'PACA'
      WHEN LEFT(oho.geo_code, 2) IN ('69', '01', '07', '26', '38', '42', '73', '74') THEN 'Auvergne-Rhône-Alpes'
      WHEN LEFT(oho.geo_code, 2) IN ('33', '24', '40', '47', '64') THEN 'Nouvelle-Aquitaine'
      WHEN LEFT(oho.geo_code, 2) IN ('31', '09', '11', '12', '30', '32', '34', '46', '48', '65', '66', '81', '82') THEN 'Occitanie'
      ELSE 'Autres régions'
    END as housing_region,
    oho.total_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.postal_code IS NOT NULL AND oho.geo_code IS NOT NULL
)
SELECT 
  owner_region,
  housing_region,
  COUNT(DISTINCT owner_id) as owners_count,
  COUNT(housing_id) as housing_count,
  ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
  CASE 
    WHEN owner_region = housing_region THEN 'Même région'
    ELSE 'Régions différentes'
  END as regional_match
FROM regional_patterns
GROUP BY owner_region, housing_region
ORDER BY housing_count DESC;

-- 6. Distance Impact on Campaign Effectiveness
-- Chart: Line chart showing campaign effectiveness by proximity
WITH campaign_effectiveness_by_proximity AS (
  SELECT 
    CASE 
      WHEN o.city = oho.city THEN 'Même ville'
      WHEN LEFT(o.postal_code, 2) = LEFT(oho.geo_code, 2) THEN 'Même département'
      WHEN LEFT(o.postal_code, 1) = LEFT(oho.geo_code, 1) THEN 'Même région (approx.)'
      ELSE 'Différente région'
    END as proximity_level,
    COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) as housing_with_campaigns,
    COUNT(oho.housing_id) as total_housing,
    ROUND(
      COUNT(CASE WHEN oho.total_sent > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 2
    ) as pct_housing_with_campaigns,
    ROUND(AVG(CASE WHEN oho.total_sent > 0 THEN oho.total_sent END), 1) as avg_campaigns_when_sent,
    COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) as housing_in_groups,
    ROUND(
      COUNT(CASE WHEN oho.total_groups > 0 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(oho.housing_id), 0), 2
    ) as pct_housing_in_groups
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
  WHERE o.city IS NOT NULL AND o.postal_code IS NOT NULL
  GROUP BY 
    CASE 
      WHEN o.city = oho.city THEN 'Même ville'
      WHEN LEFT(o.postal_code, 2) = LEFT(oho.geo_code, 2) THEN 'Même département'
      WHEN LEFT(o.postal_code, 1) = LEFT(oho.geo_code, 1) THEN 'Même région (approx.)'
      ELSE 'Différente région'
    END
)
SELECT 
  proximity_level,
  housing_with_campaigns,
  total_housing,
  pct_housing_with_campaigns,
  avg_campaigns_when_sent,
  housing_in_groups,
  pct_housing_in_groups
FROM campaign_effectiveness_by_proximity
ORDER BY 
  CASE proximity_level
    WHEN 'Même ville' THEN 1
    WHEN 'Même département' THEN 2
    WHEN 'Même région (approx.)' THEN 3
    WHEN 'Différente région' THEN 4
  END;

-- 7. Owner Address Quality Analysis
-- Chart: Bar chart showing impact of address completeness
WITH address_quality AS (
  SELECT 
    oho.owner_id,
    oho.housing_id,
    CASE 
      WHEN o.street_address IS NOT NULL AND o.city IS NOT NULL AND o.postal_code IS NOT NULL THEN 'Adresse complète'
      WHEN o.city IS NOT NULL AND o.postal_code IS NOT NULL THEN 'Ville et code postal'
      WHEN o.city IS NOT NULL OR o.postal_code IS NOT NULL THEN 'Adresse partielle'
      ELSE 'Adresse manquante'
    END as address_quality,
    oho.total_sent,
    oho.total_groups,
    oho.first_campaign_sent IS NOT NULL as received_campaign
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  LEFT JOIN dwh.main_marts.marts_production_owners o ON oho.owner_id = o.owner_id
)
SELECT 
  address_quality,
  COUNT(DISTINCT owner_id) as owners_count,
  COUNT(housing_id) as housing_count,
  ROUND(AVG(total_sent), 1) as avg_campaigns_sent,
  COUNT(CASE WHEN received_campaign THEN 1 END) as housing_with_campaigns,
  ROUND(
    COUNT(CASE WHEN received_campaign THEN 1 END) * 100.0 / 
    NULLIF(COUNT(housing_id), 0), 2
  ) as pct_housing_with_campaigns
FROM address_quality
GROUP BY address_quality
ORDER BY 
  CASE address_quality
    WHEN 'Adresse complète' THEN 1
    WHEN 'Ville et code postal' THEN 2
    WHEN 'Adresse partielle' THEN 3
    WHEN 'Adresse manquante' THEN 4
  END;

-- 8. Multi-Location Owners Analysis
-- Chart: Bar chart showing owners with properties in multiple locations
WITH multi_location_owners AS (
  SELECT 
    oho.owner_id,
    COUNT(DISTINCT oho.geo_code) as housing_locations_count,
    COUNT(DISTINCT LEFT(oho.geo_code, 2)) as housing_departments_count,
    COUNT(oho.housing_id) as total_housing_out,
    ROUND(AVG(oho.total_sent), 1) as avg_campaigns_sent,
    MAX(oho.total_sent) as max_campaigns_sent
  FROM dwh.main_marts.marts_analysis_owners_housing_out oho
  GROUP BY oho.owner_id
),
location_diversity_analysis AS (
  SELECT 
    CASE 
      WHEN housing_locations_count = 1 THEN '1 localisation'
      WHEN housing_locations_count = 2 THEN '2 localisations'
      WHEN housing_locations_count = 3 THEN '3 localisations'
      WHEN housing_locations_count >= 4 THEN '4+ localisations'
    END as location_diversity,
    COUNT(owner_id) as owners_count,
    SUM(total_housing_out) as total_housing_out,
    ROUND(AVG(total_housing_out), 1) as avg_housing_per_owner,
    ROUND(AVG(avg_campaigns_sent), 1) as avg_campaigns_sent,
    ROUND(AVG(housing_departments_count), 1) as avg_departments_per_owner
  FROM multi_location_owners
  GROUP BY 
    CASE 
      WHEN housing_locations_count = 1 THEN '1 localisation'
      WHEN housing_locations_count = 2 THEN '2 localisations'
      WHEN housing_locations_count = 3 THEN '3 localisations'
      WHEN housing_locations_count >= 4 THEN '4+ localisations'
    END
)
SELECT 
  location_diversity,
  owners_count,
  total_housing_out,
  avg_housing_per_owner,
  avg_campaigns_sent,
  avg_departments_per_owner
FROM location_diversity_analysis
ORDER BY 
  CASE location_diversity
    WHEN '1 localisation' THEN 1
    WHEN '2 localisations' THEN 2
    WHEN '3 localisations' THEN 3
    WHEN '4+ localisations' THEN 4
  END;

