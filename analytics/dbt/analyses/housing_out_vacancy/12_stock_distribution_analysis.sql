-- =====================================================
-- STOCK DISTRIBUTION ANALYSIS
-- Understanding the Composition and Distribution of Housing Stock
-- =====================================================

-- 1. Overall Stock Distribution by Campaign Participation
-- Chart: Pie chart showing total housing stock split by campaign participation
SELECT 
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END as campaign_status,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
GROUP BY 
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END
ORDER BY housing_count DESC;

-- 2. Stock Distribution by Territory Coverage
-- Chart: Bar chart showing housing stock distribution by territory status
SELECT 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END as territory_status,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END
ORDER BY housing_count DESC;

-- 3. Stock Distribution by Group Participation
-- Chart: Bar chart showing housing stock by number of groups
SELECT 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
    WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
    WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
    WHEN h.total_groups = 3 THEN 'Dans 3 groupes'
    WHEN h.total_groups = 4 THEN 'Dans 4 groupes'
    WHEN h.total_groups >= 5 THEN 'Dans 5+ groupes'
  END as group_participation,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
    WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
    WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
    WHEN h.total_groups = 3 THEN 'Dans 3 groupes'
    WHEN h.total_groups = 4 THEN 'Dans 4 groupes'
    WHEN h.total_groups >= 5 THEN 'Dans 5+ groupes'
  END
ORDER BY 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 0
    WHEN h.total_groups = 1 THEN 1
    WHEN h.total_groups = 2 THEN 2
    WHEN h.total_groups = 3 THEN 3
    WHEN h.total_groups = 4 THEN 4
    WHEN h.total_groups >= 5 THEN 5
  END;

-- 4. Stock Distribution by Campaign Intensity
-- Chart: Histogram showing distribution by number of campaigns sent
SELECT 
  CASE 
    WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
    WHEN h.total_sent = 1 THEN '1 campagne'
    WHEN h.total_sent = 2 THEN '2 campagnes'
    WHEN h.total_sent = 3 THEN '3 campagnes'
    WHEN h.total_sent = 4 THEN '4 campagnes'
    WHEN h.total_sent = 5 THEN '5 campagnes'
    WHEN h.total_sent >= 6 THEN '6+ campagnes'
  END as campaign_intensity,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN '0 campagne'
    WHEN h.total_sent = 1 THEN '1 campagne'
    WHEN h.total_sent = 2 THEN '2 campagnes'
    WHEN h.total_sent = 3 THEN '3 campagnes'
    WHEN h.total_sent = 4 THEN '4 campagnes'
    WHEN h.total_sent = 5 THEN '5 campagnes'
    WHEN h.total_sent >= 6 THEN '6+ campagnes'
  END
ORDER BY 
  CASE 
    WHEN h.total_sent IS NULL OR h.total_sent = 0 THEN 0
    WHEN h.total_sent = 1 THEN 1
    WHEN h.total_sent = 2 THEN 2
    WHEN h.total_sent = 3 THEN 3
    WHEN h.total_sent = 4 THEN 4
    WHEN h.total_sent = 5 THEN 5
    WHEN h.total_sent >= 6 THEN 6
  END;

-- 5. Stock Distribution by Vacancy Duration
-- Chart: Histogram showing distribution by years of vacancy
SELECT 
  CASE 
    WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 1 THEN '≤ 1 an'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 2 THEN '2 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 3 THEN '3 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 5 THEN '4-5 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 10 THEN '6-10 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 15 THEN '11-15 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN '> 15 ans'
  END as vacancy_duration,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.vacancy_start_year IS NULL THEN 'Non renseigné'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 1 THEN '≤ 1 an'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 2 THEN '2 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 3 THEN '3 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 5 THEN '4-5 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 10 THEN '6-10 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 15 THEN '11-15 ans'
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN '> 15 ans'
  END
ORDER BY 
  CASE 
    WHEN h.vacancy_start_year IS NULL THEN 0
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 1 THEN 1
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 2 THEN 2
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 3 THEN 3
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 5 THEN 4
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 10 THEN 5
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year <= 15 THEN 6
    WHEN DATE_PART('year', CURRENT_DATE) - h.vacancy_start_year > 15 THEN 7
  END;

-- 6. Stock Distribution by Housing Characteristics
-- Chart: Multiple bar charts showing distribution by key housing characteristics
SELECT 
  'Superficie' as characteristic_type,
  CASE 
    WHEN h.living_area IS NULL THEN 'Non renseigné'
    WHEN h.living_area < 30 THEN '< 30 m²'
    WHEN h.living_area < 50 THEN '30-49 m²'
    WHEN h.living_area < 70 THEN '50-69 m²'
    WHEN h.living_area < 100 THEN '70-99 m²'
    WHEN h.living_area < 150 THEN '100-149 m²'
    WHEN h.living_area >= 150 THEN '≥ 150 m²'
  END as characteristic_value,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.living_area IS NULL THEN 'Non renseigné'
    WHEN h.living_area < 30 THEN '< 30 m²'
    WHEN h.living_area < 50 THEN '30-49 m²'
    WHEN h.living_area < 70 THEN '50-69 m²'
    WHEN h.living_area < 100 THEN '70-99 m²'
    WHEN h.living_area < 150 THEN '100-149 m²'
    WHEN h.living_area >= 150 THEN '≥ 150 m²'
  END

UNION ALL

SELECT 
  'Nombre de pièces' as characteristic_type,
  CASE 
    WHEN h.rooms_count IS NULL THEN 'Non renseigné'
    WHEN h.rooms_count = 1 THEN '1 pièce'
    WHEN h.rooms_count = 2 THEN '2 pièces'
    WHEN h.rooms_count = 3 THEN '3 pièces'
    WHEN h.rooms_count = 4 THEN '4 pièces'
    WHEN h.rooms_count = 5 THEN '5 pièces'
    WHEN h.rooms_count >= 6 THEN '6+ pièces'
  END as characteristic_value,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.rooms_count IS NULL THEN 'Non renseigné'
    WHEN h.rooms_count = 1 THEN '1 pièce'
    WHEN h.rooms_count = 2 THEN '2 pièces'
    WHEN h.rooms_count = 3 THEN '3 pièces'
    WHEN h.rooms_count = 4 THEN '4 pièces'
    WHEN h.rooms_count = 5 THEN '5 pièces'
    WHEN h.rooms_count >= 6 THEN '6+ pièces'
  END

UNION ALL

SELECT 
  'Étiquette énergétique' as characteristic_type,
  CASE 
    WHEN h.energy_consumption_bdnb IS NULL THEN 'Non renseigné'
    WHEN h.energy_consumption_bdnb = 'A' THEN 'A (très économe)'
    WHEN h.energy_consumption_bdnb = 'B' THEN 'B (économe)'
    WHEN h.energy_consumption_bdnb = 'C' THEN 'C (correct)'
    WHEN h.energy_consumption_bdnb = 'D' THEN 'D (moyen)'
    WHEN h.energy_consumption_bdnb = 'E' THEN 'E (énergivore)'
    WHEN h.energy_consumption_bdnb = 'F' THEN 'F (très énergivore)'
    WHEN h.energy_consumption_bdnb = 'G' THEN 'G (extrêmement énergivore)'
  END as characteristic_value,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.energy_consumption_bdnb IS NULL THEN 'Non renseigné'
    WHEN h.energy_consumption_bdnb = 'A' THEN 'A (très économe)'
    WHEN h.energy_consumption_bdnb = 'B' THEN 'B (économe)'
    WHEN h.energy_consumption_bdnb = 'C' THEN 'C (correct)'
    WHEN h.energy_consumption_bdnb = 'D' THEN 'D (moyen)'
    WHEN h.energy_consumption_bdnb = 'E' THEN 'E (énergivore)'
    WHEN h.energy_consumption_bdnb = 'F' THEN 'F (très énergivore)'
    WHEN h.energy_consumption_bdnb = 'G' THEN 'G (extrêmement énergivore)'
  END

ORDER BY characteristic_type, 
  CASE characteristic_type
    WHEN 'Superficie' THEN 
      CASE characteristic_value
        WHEN 'Non renseigné' THEN 0
        WHEN '< 30 m²' THEN 1
        WHEN '30-49 m²' THEN 2
        WHEN '50-69 m²' THEN 3
        WHEN '70-99 m²' THEN 4
        WHEN '100-149 m²' THEN 5
        WHEN '≥ 150 m²' THEN 6
      END
    WHEN 'Nombre de pièces' THEN 
      CASE characteristic_value
        WHEN 'Non renseigné' THEN 0
        WHEN '1 pièce' THEN 1
        WHEN '2 pièces' THEN 2
        WHEN '3 pièces' THEN 3
        WHEN '4 pièces' THEN 4
        WHEN '5 pièces' THEN 5
        WHEN '6+ pièces' THEN 6
      END
    WHEN 'Étiquette énergétique' THEN 
      CASE characteristic_value
        WHEN 'Non renseigné' THEN 0
        WHEN 'A (très économe)' THEN 1
        WHEN 'B (économe)' THEN 2
        WHEN 'C (correct)' THEN 3
        WHEN 'D (moyen)' THEN 4
        WHEN 'E (énergivore)' THEN 5
        WHEN 'F (très énergivore)' THEN 6
        WHEN 'G (extrêmement énergivore)' THEN 7
      END
  END;

-- 7. Stock Distribution by Building Age
-- Chart: Histogram showing distribution by construction period
SELECT 
  CASE 
    WHEN h.building_year IS NULL THEN 'Non renseigné'
    WHEN h.building_year < 1919 THEN 'Avant 1919'
    WHEN h.building_year < 1946 THEN '1919-1945'
    WHEN h.building_year < 1971 THEN '1946-1970'
    WHEN h.building_year < 1991 THEN '1971-1990'
    WHEN h.building_year < 2001 THEN '1991-2000'
    WHEN h.building_year < 2011 THEN '2001-2010'
    WHEN h.building_year >= 2011 THEN '2011 et après'
  END as construction_period,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.building_year IS NULL THEN 'Non renseigné'
    WHEN h.building_year < 1919 THEN 'Avant 1919'
    WHEN h.building_year < 1946 THEN '1919-1945'
    WHEN h.building_year < 1971 THEN '1946-1970'
    WHEN h.building_year < 1991 THEN '1971-1990'
    WHEN h.building_year < 2001 THEN '1991-2000'
    WHEN h.building_year < 2011 THEN '2001-2010'
    WHEN h.building_year >= 2011 THEN '2011 et après'
  END
ORDER BY 
  CASE 
    WHEN h.building_year IS NULL THEN 0
    WHEN h.building_year < 1919 THEN 1
    WHEN h.building_year < 1946 THEN 2
    WHEN h.building_year < 1971 THEN 3
    WHEN h.building_year < 1991 THEN 4
    WHEN h.building_year < 2001 THEN 5
    WHEN h.building_year < 2011 THEN 6
    WHEN h.building_year >= 2011 THEN 7
  END;

-- 8. Stock Distribution by Mutation Characteristics
-- Chart: Bar charts showing distribution by mutation timing and type
SELECT 
  'Période de dernière mutation' as mutation_characteristic,
  CASE 
    WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
    WHEN h.last_mutation_date >= '2020-01-01' THEN '2020-2024'
    WHEN h.last_mutation_date >= '2015-01-01' AND h.last_mutation_date < '2020-01-01' THEN '2015-2019'
    WHEN h.last_mutation_date >= '2010-01-01' AND h.last_mutation_date < '2015-01-01' THEN '2010-2014'
    WHEN h.last_mutation_date >= '2005-01-01' AND h.last_mutation_date < '2010-01-01' THEN '2005-2009'
    WHEN h.last_mutation_date >= '2000-01-01' AND h.last_mutation_date < '2005-01-01' THEN '2000-2004'
    WHEN h.last_mutation_date < '2000-01-01' THEN 'Avant 2000'
  END as mutation_value,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.last_mutation_date IS NULL THEN 'Non renseigné'
    WHEN h.last_mutation_date >= '2020-01-01' THEN '2020-2024'
    WHEN h.last_mutation_date >= '2015-01-01' AND h.last_mutation_date < '2020-01-01' THEN '2015-2019'
    WHEN h.last_mutation_date >= '2010-01-01' AND h.last_mutation_date < '2015-01-01' THEN '2010-2014'
    WHEN h.last_mutation_date >= '2005-01-01' AND h.last_mutation_date < '2010-01-01' THEN '2005-2009'
    WHEN h.last_mutation_date >= '2000-01-01' AND h.last_mutation_date < '2005-01-01' THEN '2000-2004'
    WHEN h.last_mutation_date < '2000-01-01' THEN 'Avant 2000'
  END

UNION ALL

SELECT 
  'Type de mutation' as mutation_characteristic,
  COALESCE(h.last_mutation_type, 'Non renseigné') as mutation_value,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY COALESCE(h.last_mutation_type, 'Non renseigné')

ORDER BY mutation_characteristic, 
  CASE mutation_characteristic
    WHEN 'Période de dernière mutation' THEN 
      CASE mutation_value
        WHEN 'Non renseigné' THEN 0
        WHEN 'Avant 2000' THEN 1
        WHEN '2000-2004' THEN 2
        WHEN '2005-2009' THEN 3
        WHEN '2010-2014' THEN 4
        WHEN '2015-2019' THEN 5
        WHEN '2020-2024' THEN 6
      END
    WHEN 'Type de mutation' THEN 
      CASE mutation_value
        WHEN 'Non renseigné' THEN 0
        WHEN 'sale' THEN 1
        WHEN 'donation' THEN 2
        ELSE 3
      END
  END;

-- 9. Stock Distribution by Transaction Value
-- Chart: Histogram showing distribution by last transaction value
SELECT 
  CASE 
    WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
    WHEN h.last_transaction_value < 50000 THEN '< 50k€'
    WHEN h.last_transaction_value < 100000 THEN '50k-99k€'
    WHEN h.last_transaction_value < 150000 THEN '100k-149k€'
    WHEN h.last_transaction_value < 200000 THEN '150k-199k€'
    WHEN h.last_transaction_value < 300000 THEN '200k-299k€'
    WHEN h.last_transaction_value < 500000 THEN '300k-499k€'
    WHEN h.last_transaction_value >= 500000 THEN '≥ 500k€'
  END as transaction_value_range,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
GROUP BY 
  CASE 
    WHEN h.last_transaction_value IS NULL THEN 'Non renseigné'
    WHEN h.last_transaction_value < 50000 THEN '< 50k€'
    WHEN h.last_transaction_value < 100000 THEN '50k-99k€'
    WHEN h.last_transaction_value < 150000 THEN '100k-149k€'
    WHEN h.last_transaction_value < 200000 THEN '150k-199k€'
    WHEN h.last_transaction_value < 300000 THEN '200k-299k€'
    WHEN h.last_transaction_value < 500000 THEN '300k-499k€'
    WHEN h.last_transaction_value >= 500000 THEN '≥ 500k€'
  END
ORDER BY 
  CASE 
    WHEN h.last_transaction_value IS NULL THEN 0
    WHEN h.last_transaction_value < 50000 THEN 1
    WHEN h.last_transaction_value < 100000 THEN 2
    WHEN h.last_transaction_value < 150000 THEN 3
    WHEN h.last_transaction_value < 200000 THEN 4
    WHEN h.last_transaction_value < 300000 THEN 5
    WHEN h.last_transaction_value < 500000 THEN 6
    WHEN h.last_transaction_value >= 500000 THEN 7
  END;

-- 10. Cross-Distribution: Territory vs Campaign Participation
-- Chart: Stacked bar chart showing campaign participation within each territory status
SELECT 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END as territory_status,
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END as campaign_status,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (PARTITION BY 
    CASE 
      WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
      WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
      ELSE 'Non renseigné'
    END
  ), 2) as pct_within_territory,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
GROUP BY 
  CASE 
    WHEN h.is_on_user_teritory = TRUE THEN 'Sur territoire utilisateur'
    WHEN h.is_on_user_teritory = FALSE THEN 'Hors territoire utilisateur'
    ELSE 'Non renseigné'
  END,
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END
ORDER BY territory_status, campaign_status;

-- 11. Cross-Distribution: Groups vs Campaign Participation
-- Chart: Heatmap showing campaign participation by group participation level
SELECT 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
    WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
    WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
    WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
  END as group_participation,
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END as campaign_status,
  COUNT(h.housing_id) as housing_count,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (PARTITION BY 
    CASE 
      WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
      WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
      WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
      WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
    END
  ), 2) as pct_within_group_level,
  ROUND(COUNT(h.housing_id) * 100.0 / SUM(COUNT(h.housing_id)) OVER (), 2) as pct_of_total_stock
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id
GROUP BY 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 'Pas dans un groupe'
    WHEN h.total_groups = 1 THEN 'Dans 1 groupe'
    WHEN h.total_groups = 2 THEN 'Dans 2 groupes'
    WHEN h.total_groups >= 3 THEN 'Dans 3+ groupes'
  END,
  CASE 
    WHEN ch.housing_id IS NOT NULL THEN 'Dans une campagne'
    ELSE 'Pas dans une campagne'
  END
ORDER BY 
  CASE 
    WHEN h.total_groups IS NULL OR h.total_groups = 0 THEN 0
    WHEN h.total_groups = 1 THEN 1
    WHEN h.total_groups = 2 THEN 2
    WHEN h.total_groups >= 3 THEN 3
  END,
  campaign_status;

-- 12. Stock Summary Statistics
-- Chart: Table showing key stock distribution metrics
SELECT 
  'Stock total' as metric,
  COUNT(h.housing_id) as value,
  'logements' as unit
FROM dwh.main_marts.marts_production_housing h

UNION ALL

SELECT 
  'Stock dans des campagnes',
  COUNT(CASE WHEN ch.housing_id IS NOT NULL THEN 1 END),
  'logements'
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id

UNION ALL

SELECT 
  'Taux de couverture par campagnes',
  ROUND(COUNT(CASE WHEN ch.housing_id IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(h.housing_id), 0), 2),
  '%'
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_join_campaigns_housing ch ON h.housing_id = ch.housing_id

UNION ALL

SELECT 
  'Stock sur territoire utilisateur',
  COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END),
  'logements'
FROM dwh.main_marts.marts_production_housing h

UNION ALL

SELECT 
  'Taux de couverture territoriale',
  ROUND(COUNT(CASE WHEN h.is_on_user_teritory = TRUE THEN 1 END) * 100.0 / NULLIF(COUNT(h.housing_id), 0), 2),
  '%'
FROM dwh.main_marts.marts_production_housing h

UNION ALL

SELECT 
  'Stock dans des groupes',
  COUNT(CASE WHEN h.total_groups > 0 THEN 1 END),
  'logements'
FROM dwh.main_marts.marts_production_housing h

UNION ALL

SELECT 
  'Taux de participation aux groupes',
  ROUND(COUNT(CASE WHEN h.total_groups > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(h.housing_id), 0), 2),
  '%'
FROM dwh.main_marts.marts_production_housing h

ORDER BY 
  CASE metric
    WHEN 'Stock total' THEN 1
    WHEN 'Stock dans des campagnes' THEN 2
    WHEN 'Taux de couverture par campagnes' THEN 3
    WHEN 'Stock sur territoire utilisateur' THEN 4
    WHEN 'Taux de couverture territoriale' THEN 5
    WHEN 'Stock dans des groupes' THEN 6
    WHEN 'Taux de participation aux groupes' THEN 7
  END;
