{{
config (
    materialized = 'table',
    unique_key = 'housing_id',
)
}}

-- Marts BI: Dual-echelon ZLV usage at housing level
-- For each housing, provides establishment metrics from TWO echelons:
--   EPCI (CA, CC, CU, ME) and Commune
-- Fields strictly follow fields_usage_housing_establishments.csv spec

WITH housing_out AS (
    SELECT
        housing_id
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

echelons AS (
    SELECT * FROM {{ ref('int_analysis_housing_establishment_echelons') }}
),

establishment_metrics AS (
    SELECT * FROM {{ ref('int_analysis_establishments_zlv_usage') }}
)

SELECT
    CAST(ho.housing_id AS VARCHAR) AS housing_id,

    -- =====================================================
    -- EPCI ESTABLISHMENT (CA, CC, CU, ME)
    -- =====================================================
    epci.establishment_id AS epci_establishment_id,
    epci.nom AS epci_nom,
    epci.ouvert AS epci_ouvert,
    epci.date_ouverture AS epci_date_ouverture,
    epci.annee_ouverture AS epci_annee_ouverture,
    COALESCE(epci.utilisateurs_inscrits, 0) AS epci_utilisateurs_inscrits,
    epci.date_derniere_connexion AS epci_date_derniere_connexion,
    COALESCE(epci.connecte_30_jours, FALSE) AS epci_connecte_30_jours,
    COALESCE(epci.connecte_60_jours, FALSE) AS epci_connecte_60_jours,
    COALESCE(epci.connecte_90_jours, FALSE) AS epci_connecte_90_jours,
    COALESCE(epci.a_1_logement_maj_situation, FALSE) AS epci_a_1_logement_maj_situation,
    COALESCE(epci.a_1_logement_maj_occupation, FALSE) AS epci_a_1_logement_maj_occupation,
    COALESCE(epci.a_1_logement_maj_suivi, FALSE) AS epci_a_1_logement_maj_suivi,
    COALESCE(epci.a_1_logement_maj_enrichissement, FALSE) AS epci_a_1_logement_maj_enrichissement,
    COALESCE(epci.logements_maj_situation, 0) AS epci_logements_maj_situation,
    COALESCE(epci.logements_maj_enrichissement, 0) AS epci_logements_maj_enrichissement,
    epci.date_premiere_maj_situation AS epci_date_premiere_maj_situation,
    epci.date_premiere_maj_enrichissement AS epci_date_premiere_maj_enrichissement,
    epci.date_derniere_maj_situation AS epci_date_derniere_maj_situation,
    epci.date_derniere_maj_enrichissement AS epci_date_derniere_maj_enrichissement,
    epci.logements_maj_situation_pct_parc_vacant_25 AS epci_logements_maj_situation_pct_parc_vacant_25,
    epci.logements_maj_situation_pct_parc_locatif_24 AS epci_logements_maj_situation_pct_parc_locatif_24,
    COALESCE(epci.logements_maj_occupation, 0) AS epci_logements_maj_occupation,
    COALESCE(epci.logements_maj_suivi, 0) AS epci_logements_maj_suivi,
    COALESCE(epci.logements_maj_non_suivi, 0) AS epci_logements_maj_non_suivi,
    COALESCE(epci.logements_maj_en_attente, 0) AS epci_logements_maj_en_attente,
    COALESCE(epci.logements_maj_premier_contact, 0) AS epci_logements_maj_premier_contact,
    COALESCE(epci.logements_maj_suivi_en_cours, 0) AS epci_logements_maj_suivi_en_cours,
    COALESCE(epci.logements_maj_suivi_termine, 0) AS epci_logements_maj_suivi_termine,
    COALESCE(epci.logements_maj_suivi_termine_sortis, 0) AS epci_logements_maj_suivi_termine_sortis,
    COALESCE(epci.logements_maj_suivi_termine_fiabilises, 0) AS epci_logements_maj_suivi_termine_fiabilises,
    COALESCE(epci.logements_maj_bloque, 0) AS epci_logements_maj_bloque,
    COALESCE(epci.logements_maj_mails, 0) AS epci_logements_maj_mails,
    COALESCE(epci.logements_maj_phone, 0) AS epci_logements_maj_phone,
    COALESCE(epci.logements_maj_owners, 0) AS epci_logements_maj_owners,
    COALESCE(epci.logements_maj_owners_address, 0) AS epci_logements_maj_owners_address,
    epci.logements_maj_dpe AS epci_logements_maj_dpe,
    COALESCE(epci.logements_maj_notes, 0) AS epci_logements_maj_notes,
    COALESCE(epci.logements_maj_documents, 0) AS epci_logements_maj_documents,
    COALESCE(epci.documents_importes, 0) AS epci_documents_importes,
    epci.date_dernier_document_importe AS epci_date_dernier_document_importe,
    COALESCE(epci.a_1_groupe_cree, FALSE) AS epci_a_1_groupe_cree,
    COALESCE(epci.logements_exportes_via_groupes, 0) AS epci_logements_exportes_via_groupes,
    COALESCE(epci.groupes_exportes, 0) AS epci_groupes_exportes,
    COALESCE(epci.groupes_crees, 0) AS epci_groupes_crees,
    epci.date_dernier_groupe_cree AS epci_date_dernier_groupe_cree,
    COALESCE(epci.logements_contactes_via_campagnes, 0) AS epci_logements_contactes_via_campagnes,
    COALESCE(epci.a_1_campagne_envoyee_et_1_maj_situation, FALSE) AS epci_a_1_campagne_envoyee_et_1_maj_situation,
    COALESCE(epci.a_1_campagne_creee, FALSE) AS epci_a_1_campagne_creee,
    COALESCE(epci.a_1_campagne_creee_30_jours, FALSE) AS epci_a_1_campagne_creee_30_jours,
    COALESCE(epci.a_1_campagne_envoyee, FALSE) AS epci_a_1_campagne_envoyee,
    COALESCE(epci.campagnes_envoyees, 0) AS epci_campagnes_envoyees,
    COALESCE(epci.campagnes_exportees, 0) AS epci_campagnes_exportees,
    COALESCE(epci.campagnes_creees, 0) AS epci_campagnes_creees,
    epci.date_premiere_campagne_creee AS epci_date_premiere_campagne_creee,
    epci.date_derniere_campagne_creee AS epci_date_derniere_campagne_creee,
    COALESCE(epci.a_1_perimetre_importe, FALSE) AS epci_a_1_perimetre_importe,
    COALESCE(epci.perimetres_importes, 0) AS epci_perimetres_importes,
    COALESCE(epci.couches_perimetres_importes, 0) AS epci_couches_perimetres_importes,
    epci.region AS epci_region,
    epci.departement AS epci_departement,
    epci.type_detaille AS epci_type_detaille,
    epci.type_simple AS epci_type_simple,
    epci.mails_utilisateurs AS epci_mails_utilisateurs,
    epci.communes_inscrites AS epci_communes_inscrites,
    epci.communes_inscrites_pct AS epci_communes_inscrites_pct,

    -- =====================================================
    -- COMMUNE ESTABLISHMENT
    -- =====================================================
    city.establishment_id AS city_establishment_id,
    city.nom AS city_nom,
    city.ouvert AS city_ouvert,
    city.date_ouverture AS city_date_ouverture,
    city.annee_ouverture AS city_annee_ouverture,
    COALESCE(city.utilisateurs_inscrits, 0) AS city_utilisateurs_inscrits,
    city.date_derniere_connexion AS city_date_derniere_connexion,
    COALESCE(city.connecte_30_jours, FALSE) AS city_connecte_30_jours,
    COALESCE(city.connecte_60_jours, FALSE) AS city_connecte_60_jours,
    COALESCE(city.connecte_90_jours, FALSE) AS city_connecte_90_jours,
    COALESCE(city.connexions_30_jours, 0) AS city_connexions_30_jours,
    COALESCE(city.connexions_60_jours, 0) AS city_connexions_60_jours,
    COALESCE(city.connexions_90_jours, 0) AS city_connexions_90_jours,
    COALESCE(city.a_1_logement_maj_situation, FALSE) AS city_a_1_logement_maj_situation,
    COALESCE(city.a_1_logement_maj_occupation, FALSE) AS city_a_1_logement_maj_occupation,
    COALESCE(city.a_1_logement_maj_suivi, FALSE) AS city_a_1_logement_maj_suivi,
    COALESCE(city.a_1_logement_maj_enrichissement, FALSE) AS city_a_1_logement_maj_enrichissement,
    COALESCE(city.logements_maj_situation, 0) AS city_logements_maj_situation,
    COALESCE(city.logements_maj_enrichissement, 0) AS city_logements_maj_enrichissement,
    city.date_premiere_maj_situation AS city_date_premiere_maj_situation,
    city.date_premiere_maj_enrichissement AS city_date_premiere_maj_enrichissement,
    city.date_derniere_maj_situation AS city_date_derniere_maj_situation,
    city.date_derniere_maj_enrichissement AS city_date_derniere_maj_enrichissement,
    city.logements_maj_situation_pct_parc_vacant_25 AS city_logements_maj_situation_pct_parc_vacant_25,
    city.logements_maj_situation_pct_parc_locatif_24 AS city_logements_maj_situation_pct_parc_locatif_24,
    COALESCE(city.logements_maj_occupation, 0) AS city_logements_maj_occupation,
    COALESCE(city.logements_maj_suivi, 0) AS city_logements_maj_suivi,
    COALESCE(city.logements_maj_non_suivi, 0) AS city_logements_maj_non_suivi,
    COALESCE(city.logements_maj_en_attente, 0) AS city_logements_maj_en_attente,
    COALESCE(city.logements_maj_premier_contact, 0) AS city_logements_maj_premier_contact,
    COALESCE(city.logements_maj_suivi_en_cours, 0) AS city_logements_maj_suivi_en_cours,
    COALESCE(city.logements_maj_suivi_termine, 0) AS city_logements_maj_suivi_termine,
    COALESCE(city.logements_maj_suivi_termine_sortis, 0) AS city_logements_maj_suivi_termine_sortis,
    COALESCE(city.logements_maj_suivi_termine_fiabilises, 0) AS city_logements_maj_suivi_termine_fiabilises,
    COALESCE(city.logements_maj_bloque, 0) AS city_logements_maj_bloque,
    COALESCE(city.logements_maj_mails, 0) AS city_logements_maj_mails,
    COALESCE(city.logements_maj_phone, 0) AS city_logements_maj_phone,
    COALESCE(city.logements_maj_owners, 0) AS city_logements_maj_owners,
    COALESCE(city.logements_maj_owners_address, 0) AS city_logements_maj_owners_address,
    city.logements_maj_dpe AS city_logements_maj_dpe,
    COALESCE(city.logements_maj_notes, 0) AS city_logements_maj_notes,
    COALESCE(city.logements_maj_documents, 0) AS city_logements_maj_documents,
    COALESCE(city.documents_importes, 0) AS city_documents_importes,
    city.date_dernier_document_importe AS city_date_dernier_document_importe,
    COALESCE(city.a_1_groupe_cree, FALSE) AS city_a_1_groupe_cree,
    COALESCE(city.logements_exportes_via_groupes, 0) AS city_logements_exportes_via_groupes,
    COALESCE(city.groupes_exportes, 0) AS city_groupes_exportes,
    COALESCE(city.groupes_crees, 0) AS city_groupes_crees,
    city.date_dernier_groupe_cree AS city_date_dernier_groupe_cree,
    COALESCE(city.logements_contactes_via_campagnes, 0) AS city_logements_contactes_via_campagnes,
    COALESCE(city.a_1_campagne_envoyee_et_1_maj_situation, FALSE) AS city_a_1_campagne_envoyee_et_1_maj_situation,
    COALESCE(city.a_1_campagne_creee, FALSE) AS city_a_1_campagne_creee,
    COALESCE(city.a_1_campagne_creee_30_jours, FALSE) AS city_a_1_campagne_creee_30_jours,
    COALESCE(city.a_1_campagne_envoyee, FALSE) AS city_a_1_campagne_envoyee,
    COALESCE(city.campagnes_envoyees, 0) AS city_campagnes_envoyees,
    COALESCE(city.campagnes_exportees, 0) AS city_campagnes_exportees,
    COALESCE(city.campagnes_creees, 0) AS city_campagnes_creees,
    city.date_premiere_campagne_creee AS city_date_premiere_campagne_creee,
    city.date_derniere_campagne_creee AS city_date_derniere_campagne_creee,
    COALESCE(city.a_1_perimetre_importe, FALSE) AS city_a_1_perimetre_importe,
    COALESCE(city.perimetres_importes, 0) AS city_perimetres_importes,
    COALESCE(city.couches_perimetres_importes, 0) AS city_couches_perimetres_importes,
    city.region AS city_region,
    city.departement AS city_departement,
    city.type_detaille AS city_type_detaille,
    city.type_simple AS city_type_simple,
    city.mails_utilisateurs AS city_mails_utilisateurs

FROM housing_out ho
LEFT JOIN echelons ec ON CAST(ho.housing_id AS VARCHAR) = ec.housing_id
LEFT JOIN establishment_metrics epci ON ec.epci_establishment_id = epci.establishment_id
LEFT JOIN establishment_metrics city ON ec.city_establishment_id = city.establishment_id
