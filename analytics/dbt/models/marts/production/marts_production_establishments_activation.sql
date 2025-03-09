{{
config (
  materialized = 'table',
  unique_key = 'establishment_id',
)
}}

SELECT
  CAST(e.establishment_id AS VARCHAR) AS establishment_id,
  CASE 
    WHEN e.connected_last_90_days THEN 'Oui'
    ELSE '👻 Fantôme'
  END AS connecte_90_derniers_jours,
  CASE 
    WHEN e.connected_last_60_days THEN 'Oui' 
    ELSE 'Non'
  END AS connecte_60_derniers_jours,
  CASE 
    WHEN e.connected_last_30_days THEN 'Oui' 
    ELSE 'Non'
  END AS connecte_30_derniers_jours,
  CASE 
    WHEN e.total_perimeters > 0 THEN 'oui' 
    ELSE 'non'
  END AS a_depose_1_perimetre,
  
  CASE 
    WHEN e.total_groups > 0 THEN 'oui' 
    ELSE 'non'
  END AS a_cree_1_groupe,
  CASE 
    WHEN e.total_campaigns > 0 THEN 'oui' 
    ELSE 'non'
  END AS a_cree_1_campagne,
  CASE 
    WHEN e.is_creation_lt_30_days THEN 'Oui' 
    ELSE 'Non'
  END AS a_cree_1_campagne_30_derniers_jours,
  CASE 
    WHEN e.total_sent_campaigns > 0 THEN 'oui' 
    ELSE 'non'
  END AS a_envoye_1_campagne,
  CASE 
    WHEN e.last_event_status_user_followup IS NULL THEN 'Non' 
    ELSE 'Oui'
  END AS a_fait_1_maj_suivi,
  CASE 
    WHEN e.last_event_occupancy_user_occupancy IS NULL THEN 'Non' 
    ELSE 'Oui'
  END AS a_fait_1_maj_occupation,
  CASE 
    WHEN e.last_event_status_user_followup IS NULL AND e.last_event_occupancy_user_occupancy IS NULL THEN 'Non'
    ELSE 'Oui'
  END AS a_fait_1_maj,
  CASE 
    WHEN e.total_sent_campaigns > 0 AND e.last_event_status_user_followup IS NOT NULL THEN 'Oui' 
    ELSE 'Non'
  END AS a_fait_1_campagne_ET_1_maj,
  CASE 
    WHEN e.total_groups = 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 THEN '(1) CT inactive'
    WHEN e.total_groups > 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 THEN '(2) CT en analyse'
    WHEN (e.total_groups > 0 OR e.total_groups = 0) AND e.total_campaigns > 0 AND e.total_sent_campaigns = 0 THEN '(3) CT en campagne'
    WHEN (e.total_groups > 0 OR e.total_groups = 0) AND e.total_campaigns > 0 AND e.total_sent_campaigns > 0 THEN '(4) CT activée'
    ELSE 'Erreur de classification'
  END AS typologie_activation_simple,
  CASE 
    WHEN e.connected_last_60_days = FALSE AND e.total_groups = 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 
      THEN '(1.1) CT inactive et fantôme'
    WHEN e.connected_last_60_days = TRUE AND e.total_groups = 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 
      THEN '(1.2) CT inactive et visiteuse'
    WHEN e.connected_last_60_days = FALSE AND e.total_groups > 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 
      THEN '(2.1) CT en analyse et fantôme'
    WHEN e.connected_last_60_days = TRUE AND e.total_groups > 0 AND e.total_campaigns = 0 AND e.total_sent_campaigns = 0 
      THEN '(2.2) CT en analyse et visiteuse'
    WHEN e.connected_last_60_days = FALSE AND e.total_campaigns > 0 AND e.total_sent_campaigns = 0 
      THEN '(3.1) CT en campagne et fantôme'
    WHEN e.connected_last_60_days = TRUE AND e.total_campaigns > 0 AND e.total_sent_campaigns = 0 
      THEN '(3.2) CT en campagne et visiteuse'
    WHEN e.connected_last_60_days = FALSE AND e.total_campaigns > 0 AND e.total_sent_campaigns > 0 
      AND (e.last_event_status_user_followup IS NULL AND e.last_event_occupancy_user_occupancy IS NULL)
      THEN '(4.1) CT pro-active et fantôme'
    WHEN e.connected_last_60_days = TRUE AND e.total_campaigns > 0 AND e.total_sent_campaigns > 0 
      AND (e.last_event_status_user_followup IS NULL AND e.last_event_occupancy_user_occupancy IS NULL)
      THEN '(4.2) CT pro-active et visiteuse'
    WHEN e.connected_last_60_days = FALSE AND e.total_campaigns > 0 AND e.total_sent_campaigns > 0 
      AND (e.last_event_status_user_followup IS NOT NULL OR e.last_event_occupancy_user_occupancy IS NOT NULL)
      THEN '(5.1) CT exemplaire et fantôme'
    WHEN e.connected_last_60_days = TRUE AND e.total_campaigns > 0 AND e.total_sent_campaigns > 0 
      AND (e.last_event_status_user_followup IS NOT NULL OR e.last_event_occupancy_user_occupancy IS NOT NULL)
      THEN '(5.2) CT exemplaire et visiteuse'
    ELSE 'Erreur de classification'
  END AS typologie_activation_detaillee,
  
  CASE 
    WHEN e.kind = 'CA' THEN 'Communauté d''Agglomération'
    WHEN e.kind = 'CC' THEN 'Communauté des Communes'
    WHEN e.kind = 'CU' THEN 'Communauté Urbaine'
    WHEN e.kind = 'Commune' THEN 'Commune'
    WHEN e.kind = 'ME' THEN 'Métropole'
    WHEN e.kind = 'DEP' THEN 'Département'
    WHEN e.kind = 'PETR' THEN 'Pôle Équilibre Territorial'
    WHEN e.kind = 'REG' THEN 'Région'
    WHEN e.kind = 'SDED' THEN 'Service Déconcentré Départemental'
    WHEN e.kind = 'SDER' THEN 'Service Déconcentré Régional'
    WHEN e.kind = 'ASSO' THEN 'Association'
    ELSE e.kind
  END AS type_explicite,
CASE 
    WHEN e.kind IN ('CA', 'CC', 'CU', 'ME') THEN 'Intercommunalité'
    WHEN e.kind = 'Commune' THEN 'Commune'
    WHEN e.kind = 'SDED' THEN 'DDT/M'
    WHEN e.kind IN ('DEP', 'PETR', 'REG', 'SDER', 'ASSO') THEN 'Autre'
    ELSE 'Autre'
  END AS type_regroupe
  
FROM {{ ref('marts_production_establishments') }} e
