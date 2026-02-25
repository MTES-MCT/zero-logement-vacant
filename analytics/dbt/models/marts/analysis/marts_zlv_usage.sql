{{
config (
    materialized = 'table',
    unique_key = 'establishment_id',
)
}}

-- Marts: Establishment-level ZLV usage metrics
-- Contains only fields referenced in fields_usage_establishments.csv
-- Excludes activation/pro-activity derived typologies

SELECT
    -- =====================================================
    -- DIMENSIONS
    -- =====================================================
    eu.establishment_id,
    eu.nom,
    eu.ouvert,
    eu.date_ouverture,
    eu.annee_ouverture,

    -- =====================================================
    -- UTILISATEURS / CONNEXIONS
    -- =====================================================
    eu.utilisateurs_inscrits,
    eu.date_derniere_connexion,
    eu.connecte_30_jours,
    eu.connecte_60_jours,
    eu.connecte_90_jours,

    -- =====================================================
    -- LOGEMENTS MIS A JOUR - SITUATION
    -- =====================================================
    eu.a_1_logement_maj_situation,
    eu.a_1_logement_maj_occupation,
    eu.a_1_logement_maj_suivi,
    eu.a_1_logement_maj_enrichissement,
    eu.logements_maj_situation,
    eu.logements_maj_enrichissement,
    eu.date_premiere_maj_situation,
    eu.date_premiere_maj_enrichissement,
    eu.date_derniere_maj_situation,
    eu.date_derniere_maj_enrichissement,
    eu.logements_maj_situation_pct_parc_vacant_25,
    eu.logements_maj_situation_pct_parc_locatif_24,
    eu.logements_maj_occupation,
    eu.logements_maj_suivi,
    eu.logements_maj_non_suivi,
    eu.logements_maj_en_attente,
    eu.logements_maj_premier_contact,
    eu.logements_maj_suivi_en_cours,
    eu.logements_maj_suivi_termine,
    eu.logements_maj_suivi_termine_sortis,
    eu.logements_maj_suivi_termine_fiabilises,
    eu.logements_maj_bloque,
    eu.logements_maj_mails,
    eu.logements_maj_phone,
    eu.logements_maj_owners,
    eu.logements_maj_owners_address,
    eu.logements_maj_dpe,
    eu.logements_maj_notes,
    eu.logements_maj_documents,

    -- =====================================================
    -- DOCUMENTS
    -- =====================================================
    eu.documents_importes,
    eu.date_dernier_document_importe,

    -- =====================================================
    -- GROUPES
    -- =====================================================
    eu.a_1_groupe_cree,
    eu.logements_exportes_via_groupes,
    eu.groupes_exportes,
    eu.groupes_crees,
    eu.date_dernier_groupe_cree,

    -- =====================================================
    -- CAMPAGNES
    -- =====================================================
    eu.logements_contactes_via_campagnes,
    eu.a_1_campagne_envoyee_et_1_maj_situation,
    eu.a_1_campagne_creee,
    eu.a_1_campagne_creee_30_jours,
    eu.a_1_campagne_envoyee,
    eu.campagnes_envoyees,
    eu.campagnes_exportees,
    eu.campagnes_creees,
    eu.date_premiere_campagne_creee,
    eu.date_derniere_campagne_creee,

    -- =====================================================
    -- PERIMETRES
    -- =====================================================
    eu.a_1_perimetre_importe,
    eu.perimetres_importes,
    eu.couches_perimetres_importes,

    -- =====================================================
    -- REFERENTS COMPARATIFS
    -- =====================================================
    eu.region,
    eu.departement,
    eu.type_detaille,
    eu.type_simple,

    -- =====================================================
    -- PRISE DE CONTACT
    -- =====================================================
    eu.mails_utilisateurs,

    -- =====================================================
    -- ECHELONS INSCRITS
    -- =====================================================
    eu.communes_inscrites,
    eu.communes_inscrites_pct,
    eu.intercommunalites_inscrites,
    eu.intercommunalites_inscrites_pct,
    eu.departements_inscrits,
    eu.departements_inscrits_pct,
    eu.sded_inscrits,
    eu.sded_inscrits_pct

FROM {{ ref('int_analysis_establishments_zlv_usage') }} eu
