WITH matching_scores AS (
  SELECT 
    h.unique_id AS unique_id_housing,
    h.ban_id,
    d.unique_id AS unique_id_histo,
    
    
    CASE
      WHEN h.superficie IS NULL OR d.superficie IS NULL THEN 0
      WHEN h.superficie = d.superficie THEN 10
      WHEN h.superficie = 0 AND d.superficie = 0 THEN 10
      WHEN GREATEST(h.superficie, d.superficie) = 0 THEN 0  
      WHEN ABS(h.superficie - d.superficie) / GREATEST(h.superficie, d.superficie) < 0.01 THEN 9
      WHEN ABS(h.superficie - d.superficie) / GREATEST(h.superficie, d.superficie) < 0.03 THEN 8
      WHEN ABS(h.superficie - d.superficie) / GREATEST(h.superficie, d.superficie) < 0.1 THEN 6
      WHEN ABS(h.superficie - d.superficie) / GREATEST(h.superficie, d.superficie) < 0.3 THEN 3
      ELSE 1
    END AS superficie_score,
    
    
    CASE
      WHEN h.full_name IS NULL OR d.full_name IS NULL THEN 0
      
      WHEN h.full_name = d.full_name THEN 10
      
      WHEN trim(replace(replace(replace(lower(h.full_name), 'm ', ''), 'mme ', ''), 'sci ', '')) = 
           trim(replace(replace(replace(lower(d.full_name), 'm ', ''), 'mme ', ''), 'sci ', '')) THEN 9
      
      WHEN (
          
          (
            split_part(lower(h.full_name), ' ', 2) != '' AND 
            split_part(lower(h.full_name), ' ', 3) != '' AND
            lower(d.full_name) LIKE '%' || split_part(lower(h.full_name), ' ', 2) || '%' AND 
            lower(d.full_name) LIKE '%' || split_part(lower(h.full_name), ' ', 3) || '%' AND
            length(split_part(h.full_name, ' ', 2)) > 2 AND
            length(split_part(h.full_name, ' ', 3)) > 2
          )
          OR
          
          (
            split_part(lower(d.full_name), ' ', 1) != '' AND 
            split_part(lower(d.full_name), ' ', 2) != '' AND
            lower(h.full_name) LIKE '%' || split_part(lower(d.full_name), ' ', 1) || '%' AND 
            lower(h.full_name) LIKE '%' || split_part(lower(d.full_name), ' ', 2) || '%' AND
            length(split_part(d.full_name, ' ', 1)) > 2 AND
            length(split_part(d.full_name, ' ', 2)) > 2
          )
        ) THEN 8
      
      WHEN jaro_winkler_similarity(lower(h.full_name), lower(d.full_name)) >= 0.92 THEN 7
      
      WHEN lower(h.full_name) LIKE '%' || lower(d.full_name) || '%' OR
           lower(d.full_name) LIKE '%' || lower(h.full_name) || '%' THEN 6
      
      WHEN jaro_winkler_similarity(lower(h.full_name), lower(d.full_name)) >= 0.85 THEN 5
      
      WHEN jaro_winkler_similarity(lower(h.full_name), lower(d.full_name)) >= 0.7 THEN 3
      ELSE 0
    END AS full_name_score,
    
    
    CASE
      WHEN h.prenom_proprio IS NULL OR d.prenom_proprio IS NULL THEN 0
      
      WHEN lower(trim(h.prenom_proprio)) = lower(trim(d.prenom_proprio)) THEN 10
      
      WHEN jaro_winkler_similarity(lower(trim(h.prenom_proprio)), lower(trim(d.prenom_proprio))) >= 0.92 THEN 8
      
      WHEN lower(trim(d.full_name)) LIKE '%' || lower(trim(h.prenom_proprio)) || '%' OR
           lower(trim(h.full_name)) LIKE '%' || lower(trim(d.prenom_proprio)) || '%' THEN 7
      
      WHEN jaro_winkler_similarity(lower(trim(h.prenom_proprio)), lower(trim(d.prenom_proprio))) >= 0.85 THEN 6
      
      WHEN left(lower(trim(h.prenom_proprio)), 1) = left(lower(trim(d.prenom_proprio)), 1) AND
           jaro_winkler_similarity(lower(trim(h.prenom_proprio)), lower(trim(d.prenom_proprio))) >= 0.7 THEN 5
      
      WHEN jaro_winkler_similarity(lower(trim(h.prenom_proprio)), lower(trim(d.prenom_proprio))) >= 0.7 THEN 3
      
      WHEN left(lower(trim(h.prenom_proprio)), 1) = left(lower(trim(d.prenom_proprio)), 1) THEN 2
      ELSE 0
    END AS prenom_score,
    
    
    CASE
      WHEN h.nom_proprio IS NULL OR d.nom_proprio IS NULL THEN 0
      
      WHEN lower(trim(h.nom_proprio)) = lower(trim(d.nom_proprio)) THEN 10
      
      WHEN (lower(trim(d.full_name)) LIKE '%' || lower(trim(h.nom_proprio)) || '%' OR
            lower(trim(h.full_name)) LIKE '%' || lower(trim(d.nom_proprio)) || '%') AND
           length(trim(h.nom_proprio)) > 3 AND length(trim(d.nom_proprio)) > 3 THEN 8
      
      WHEN jaro_winkler_similarity(lower(trim(h.nom_proprio)), lower(trim(d.nom_proprio))) >= 0.92 THEN 8
      
      WHEN lower(trim(d.full_name)) LIKE '%' || lower(trim(h.nom_proprio)) || '%' OR
           lower(trim(h.full_name)) LIKE '%' || lower(trim(d.nom_proprio)) || '%' THEN 7
      
      WHEN jaro_winkler_similarity(lower(trim(h.nom_proprio)), lower(trim(d.nom_proprio))) >= 0.85 THEN 6
      
      WHEN replace(replace(replace(replace(replace(lower(trim(h.nom_proprio)), 'de ', ''), 'le ', ''), 'la ', ''), 'du ', ''), 'van ', '') = 
           replace(replace(replace(replace(replace(lower(trim(d.nom_proprio)), 'de ', ''), 'le ', ''), 'la ', ''), 'du ', ''), 'van ', '') THEN 6
      
      WHEN jaro_winkler_similarity(lower(trim(h.nom_proprio)), lower(trim(d.nom_proprio))) >= 0.7 THEN 3
      
      WHEN split_part(lower(trim(h.nom_proprio)), ' ', 1) = split_part(lower(trim(d.nom_proprio)), ' ', 1) AND
           length(split_part(lower(trim(h.nom_proprio)), ' ', 1)) > 2 THEN 2
      ELSE 0
    END AS nom_score,
    
    
    CASE
      WHEN h.code_postal_proprio IS NULL OR d.code_postal_proprio IS NULL THEN 0
      WHEN h.code_postal_proprio = d.code_postal_proprio THEN 10
      
      WHEN left(h.code_postal_proprio, 3) = left(d.code_postal_proprio, 3) THEN 7
      WHEN left(h.code_postal_proprio, 2) = left(d.code_postal_proprio, 2) THEN 5
      ELSE 0
    END AS code_postal_score,
    
    
    CASE
      WHEN h.ville_proprio IS NULL OR d.ville_proprio IS NULL THEN 0
      WHEN lower(trim(h.ville_proprio)) = lower(trim(d.ville_proprio)) THEN 10
      
      WHEN levenshtein(lower(trim(h.ville_proprio)), lower(trim(d.ville_proprio))) <= 2 THEN 8
      
      WHEN levenshtein(lower(trim(h.ville_proprio)), lower(trim(d.ville_proprio))) <= 6 THEN 5
      
      WHEN levenshtein(lower(trim(h.ville_proprio)), lower(trim(d.ville_proprio))) <= 10 THEN 2
      ELSE 0
    END AS ville_score,
    
    
    CASE
      WHEN h.adresse_proprio IS NULL OR d.adresse_proprio IS NULL THEN 0
      WHEN lower(trim(h.adresse_proprio)) = lower(trim(d.adresse_proprio)) THEN 10
      
      WHEN levenshtein(lower(trim(h.adresse_proprio)), lower(trim(d.adresse_proprio))) <= 2 THEN 8
      
      WHEN levenshtein(lower(trim(h.adresse_proprio)), lower(trim(d.adresse_proprio))) <= 6 THEN 5
      
      WHEN levenshtein(lower(trim(h.adresse_proprio)), lower(trim(d.adresse_proprio))) <= 10 THEN 2
      ELSE 0
    END AS adresse_score,
    
    
    CASE
      WHEN h.nb_pieces_logement IS NULL OR d.nb_pieces_logement IS NULL THEN 0
      WHEN h.nb_pieces_logement = d.nb_pieces_logement THEN 10
      WHEN h.nb_pieces_logement = 0 AND d.nb_pieces_logement = 0 THEN 10  
      WHEN GREATEST(h.nb_pieces_logement, d.nb_pieces_logement) = 0 THEN 0  
      WHEN ABS(h.nb_pieces_logement - d.nb_pieces_logement) / GREATEST(h.nb_pieces_logement, d.nb_pieces_logement) < 0.01 THEN 9
      WHEN ABS(h.nb_pieces_logement - d.nb_pieces_logement) / GREATEST(h.nb_pieces_logement, d.nb_pieces_logement) < 0.03 THEN 8
      WHEN ABS(h.nb_pieces_logement - d.nb_pieces_logement) / GREATEST(h.nb_pieces_logement, d.nb_pieces_logement) < 0.1 THEN 6
      WHEN ABS(h.nb_pieces_logement - d.nb_pieces_logement) / GREATEST(h.nb_pieces_logement, d.nb_pieces_logement) < 0.3 THEN 3
      
      WHEN ABS(h.nb_pieces_logement - d.nb_pieces_logement) = 1 THEN 5
      ELSE 0
    END AS nb_pieces_score,
    
    
    CASE
      WHEN h.ban_id = d.ban_id AND h.ban_id IS NOT NULL AND d.ban_id IS NOT NULL THEN 20
      ELSE 0
    END AS ban_id_score
    
  FROM housing_prepared h
  INNER JOIN histo_data d
  
  ON (
      
      (h.code_postal_proprio = d.code_postal_proprio 
        OR h.code_postal_proprio IS NULL 
        OR d.code_postal_proprio IS NULL)
      
      
      OR (h.ban_id = d.ban_id AND h.ban_id IS NOT NULL)
      
      
      OR (
          (lower(trim(h.nom_proprio)) = lower(trim(d.nom_proprio)) OR
           jaro_winkler_similarity(lower(trim(h.nom_proprio)), lower(trim(d.nom_proprio))) >= 0.9)
          AND
          (lower(trim(h.prenom_proprio)) = lower(trim(d.prenom_proprio)) OR
           jaro_winkler_similarity(lower(trim(h.prenom_proprio)), lower(trim(d.prenom_proprio))) >= 0.9)
      )
      
      
      OR (
          jaro_winkler_similarity(
              replace(replace(replace(lower(trim(h.full_name)), 'm ', ''), 'mme ', ''), 'sci ', ''),
              replace(replace(replace(lower(trim(d.full_name)), 'm ', ''), 'mme ', ''), 'sci ', '')
          ) >= 0.9
      )
  )
)

SELECT 
  matching_scores.unique_id_housing,
  matching_scores.ban_id,
  matching_scores.unique_id_histo,
  
  
  h.full_name AS full_name_housing,
  h.nb_pieces_logement AS nb_pieces_logement_housing,
  h.superficie AS superficie_housing,
  h.prenom_proprio AS prenom_proprio_housing,
  h.nom_proprio AS nom_proprio_housing,
  h.code_postal_proprio AS code_postal_proprio_housing,
  h.adresse_proprio AS adresse_proprio_housing,
  h.ville_proprio AS ville_proprio_housing,
  
  
  d.full_name AS full_name_histo,
  d.nb_pieces_logement AS nb_pieces_logement_histo,
  d.superficie AS superficie_histo,
  d.prenom_proprio AS prenom_proprio_histo,
  d.nom_proprio AS nom_proprio_histo,
  d.code_postal_proprio AS code_postal_proprio_histo,
  d.adresse_proprio AS adresse_proprio_histo,
  d.ville_proprio AS ville_proprio_histo,
  
  superficie_score,
  prenom_score,
  full_name_score,
  nom_score,
  code_postal_score,
  ville_score,
  adresse_score,
  nb_pieces_score,
  ban_id_score,
  
  (
    superficie_score * 0.10 +
    prenom_score * 0.15 +
    full_name_score * 0.10 +
    nom_score * 0.20 +
    code_postal_score * 0.15 +
    ville_score * 0.05 +
    adresse_score * 0.05 +
    nb_pieces_score * 0.10 +
    ban_id_score * 0.10
  ) AS match_score 

FROM matching_scores
LEFT JOIN housing_prepared h ON matching_scores.unique_id_housing = h.unique_id
LEFT JOIN histo_data d ON matching_scores.unique_id_histo = d.unique_id

ORDER BY match_score DESC