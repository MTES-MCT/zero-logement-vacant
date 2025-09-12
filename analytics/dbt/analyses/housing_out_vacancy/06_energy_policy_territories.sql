-- =====================================================
-- ENERGY AND POLICY TERRITORIES ANALYSIS
-- Housing Out of Vacancy vs Total Stock - Energy Performance and Policy Areas
-- =====================================================

-- 1. Energy Performance Analysis
-- Chart: Bar chart showing housing out by energy consumption levels
SELECT 
  COALESCE(h.energy_consumption_bdnb, 'Non renseigné') as energy_class,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY COALESCE(h.energy_consumption_bdnb, 'Non renseigné')
ORDER BY 
  CASE COALESCE(h.energy_consumption_bdnb, 'Non renseigné')
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
    WHEN 'F' THEN 6
    WHEN 'G' THEN 7
    WHEN 'Non renseigné' THEN 8
  END;

-- 2. Energy Sieve Analysis (F and G classes)
-- Chart: Pie chart showing energy sieve vs non-energy sieve
SELECT 
  CASE 
    WHEN h.energy_sieve = TRUE THEN 'Passoire énergétique (F-G)'
    WHEN h.energy_sieve = FALSE THEN 'Non passoire énergétique'
    ELSE 'Non renseigné'
  END as energy_sieve_status,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.energy_sieve = TRUE THEN 'Passoire énergétique (F-G)'
    WHEN h.energy_sieve = FALSE THEN 'Non passoire énergétique'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 3. Vacancy Duration Analysis (2+ years vacant)
-- Chart: Bar chart showing long-term vacancy impact
SELECT 
  CASE 
    WHEN h.vacant_two_years = TRUE THEN 'Vacant depuis 2+ ans'
    WHEN h.vacant_two_years = FALSE THEN 'Vacant depuis moins de 2 ans'
    ELSE 'Non renseigné'
  END as long_term_vacancy,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.vacant_two_years = TRUE THEN 'Vacant depuis 2+ ans'
    WHEN h.vacant_two_years = FALSE THEN 'Vacant depuis moins de 2 ans'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 4. OPAH Territory Analysis
-- Chart: Bar chart showing OPAH territory impact
SELECT 
  CASE 
    WHEN h.is_in_opah_teritory = TRUE THEN 'En territoire OPAH'
    WHEN h.is_in_opah_teritory = FALSE THEN 'Hors territoire OPAH'
    ELSE 'Non renseigné'
  END as opah_territory,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.is_in_opah_teritory = TRUE THEN 'En territoire OPAH'
    WHEN h.is_in_opah_teritory = FALSE THEN 'Hors territoire OPAH'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 5. TLV (Taxe sur les Logements Vacants) Analysis
-- Chart: Stacked bar chart showing TLV1 and TLV2 territories
WITH tlv_analysis AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    h.is_in_tlv1_teritory,
    h.is_in_tlv2_teritory,
    CASE 
      WHEN h.is_in_tlv1_teritory = TRUE AND h.is_in_tlv2_teritory = TRUE THEN 'TLV1 et TLV2'
      WHEN h.is_in_tlv1_teritory = TRUE AND (h.is_in_tlv2_teritory = FALSE OR h.is_in_tlv2_teritory IS NULL) THEN 'TLV1 seulement'
      WHEN h.is_in_tlv2_teritory = TRUE AND (h.is_in_tlv1_teritory = FALSE OR h.is_in_tlv1_teritory IS NULL) THEN 'TLV2 seulement'
      WHEN h.is_in_tlv1_teritory = FALSE AND h.is_in_tlv2_teritory = FALSE THEN 'Aucune TLV'
      ELSE 'Non renseigné'
    END as tlv_status
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
)
SELECT 
  tlv_status,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as pct_housing_out
FROM tlv_analysis
GROUP BY tlv_status
ORDER BY pct_housing_out DESC;

-- 6. Action Cœur de Ville Analysis
-- Chart: Bar chart showing Action Cœur de Ville territories
WITH action_coeur_ville AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    CASE 
      WHEN h.is_in_action_coeur_de_ville_1_teritory = TRUE THEN 'Action Cœur de Ville 1'
      WHEN h.is_in_action_coeur_de_ville_teritory = TRUE THEN 'Action Cœur de Ville'
      ELSE 'Hors Action Cœur de Ville'
    END as action_coeur_ville_status
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
)
SELECT 
  action_coeur_ville_status,
  COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
  COUNT(*) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as pct_housing_out
FROM action_coeur_ville
GROUP BY action_coeur_ville_status
ORDER BY pct_housing_out DESC;

-- 7. Petite Ville de Demain Analysis
-- Chart: Bar chart showing Petite Ville de Demain territories
SELECT 
  CASE 
    WHEN h.is_in_petite_ville_de_demain_teritory = TRUE THEN 'Petite Ville de Demain'
    WHEN h.is_in_petite_ville_de_demain_teritory = FALSE THEN 'Hors Petite Ville de Demain'
    ELSE 'Non renseigné'
  END as petite_ville_demain_status,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.is_in_petite_ville_de_demain_teritory = TRUE THEN 'Petite Ville de Demain'
    WHEN h.is_in_petite_ville_de_demain_teritory = FALSE THEN 'Hors Petite Ville de Demain'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 8. Village d'Avenir Analysis
-- Chart: Bar chart showing Village d'Avenir territories
SELECT 
  CASE 
    WHEN h.is_in_village_davenir_teritory = TRUE THEN 'Village d''Avenir'
    WHEN h.is_in_village_davenir_teritory = FALSE THEN 'Hors Village d''Avenir'
    ELSE 'Non renseigné'
  END as village_avenir_status,
  COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
  COUNT(h.housing_id) as total_housing_count,
  ROUND(
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
    NULLIF(COUNT(h.housing_id), 0), 2
  ) as pct_housing_out
FROM dwh.main_marts.marts_production_housing h
LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
GROUP BY 
  CASE 
    WHEN h.is_in_village_davenir_teritory = TRUE THEN 'Village d''Avenir'
    WHEN h.is_in_village_davenir_teritory = FALSE THEN 'Hors Village d''Avenir'
    ELSE 'Non renseigné'
  END
ORDER BY pct_housing_out DESC;

-- 9. Combined Policy Territories Analysis
-- Chart: Heatmap or stacked bar showing multiple policy overlaps
WITH policy_territories AS (
  SELECT 
    h.housing_id,
    ho.housing_id IS NOT NULL as is_out,
    -- Count how many policy territories the housing is in
    COALESCE(CAST(h.is_in_opah_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_tlv1_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_tlv2_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_action_coeur_de_ville_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_action_coeur_de_ville_1_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_petite_ville_de_demain_teritory AS INTEGER), 0) +
    COALESCE(CAST(h.is_in_village_davenir_teritory AS INTEGER), 0) as policy_count
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
),
policy_categories AS (
  SELECT 
    CASE 
      WHEN policy_count = 0 THEN 'Aucun dispositif'
      WHEN policy_count = 1 THEN '1 dispositif'
      WHEN policy_count = 2 THEN '2 dispositifs'
      WHEN policy_count = 3 THEN '3 dispositifs'
      WHEN policy_count >= 4 THEN '4+ dispositifs'
    END as policy_category,
    COUNT(CASE WHEN is_out THEN 1 END) as housing_out_count,
    COUNT(*) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN is_out THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 2
    ) as pct_housing_out,
    ROUND(AVG(CASE WHEN is_out THEN policy_count END), 1) as avg_policies_out,
    ROUND(AVG(policy_count), 1) as avg_policies_total
  FROM policy_territories
  GROUP BY 
    CASE 
      WHEN policy_count = 0 THEN 'Aucun dispositif'
      WHEN policy_count = 1 THEN '1 dispositif'
      WHEN policy_count = 2 THEN '2 dispositifs'
      WHEN policy_count = 3 THEN '3 dispositifs'
      WHEN policy_count >= 4 THEN '4+ dispositifs'
    END
)
SELECT 
  policy_category,
  housing_out_count,
  total_housing_count,
  pct_housing_out,
  avg_policies_out,
  avg_policies_total
FROM policy_categories
ORDER BY 
  CASE policy_category
    WHEN 'Aucun dispositif' THEN 0
    WHEN '1 dispositif' THEN 1
    WHEN '2 dispositifs' THEN 2
    WHEN '3 dispositifs' THEN 3
    WHEN '4+ dispositifs' THEN 4
  END;

-- 10. Energy Performance vs Policy Territories Cross-Analysis
-- Chart: Heatmap showing energy performance vs policy territories
WITH energy_policy_cross AS (
  SELECT 
    COALESCE(h.energy_consumption_bdnb, 'Non renseigné') as energy_class,
    CASE 
      WHEN h.is_in_opah_teritory = TRUE OR h.is_in_tlv1_teritory = TRUE OR h.is_in_tlv2_teritory = TRUE 
           OR h.is_in_action_coeur_de_ville_teritory = TRUE OR h.is_in_petite_ville_de_demain_teritory = TRUE 
           OR h.is_in_village_davenir_teritory = TRUE THEN 'Dans un dispositif'
      ELSE 'Hors dispositif'
    END as policy_status,
    COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) as housing_out_count,
    COUNT(h.housing_id) as total_housing_count,
    ROUND(
      COUNT(CASE WHEN ho.housing_id IS NOT NULL THEN 1 END) * 100.0 / 
      NULLIF(COUNT(h.housing_id), 0), 2
    ) as pct_housing_out
  FROM dwh.main_marts.marts_production_housing h
  LEFT JOIN dwh.main_marts.marts_production_housing_out ho ON h.housing_id = ho.housing_id
  GROUP BY 
    COALESCE(h.energy_consumption_bdnb, 'Non renseigné'),
    CASE 
      WHEN h.is_in_opah_teritory = TRUE OR h.is_in_tlv1_teritory = TRUE OR h.is_in_tlv2_teritory = TRUE 
           OR h.is_in_action_coeur_de_ville_teritory = TRUE OR h.is_in_petite_ville_de_demain_teritory = TRUE 
           OR h.is_in_village_davenir_teritory = TRUE THEN 'Dans un dispositif'
      ELSE 'Hors dispositif'
    END
)
SELECT 
  energy_class,
  policy_status,
  housing_out_count,
  total_housing_count,
  pct_housing_out
FROM energy_policy_cross
ORDER BY 
  CASE energy_class
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
    WHEN 'F' THEN 6
    WHEN 'G' THEN 7
    WHEN 'Non renseigné' THEN 8
  END,
  policy_status;

