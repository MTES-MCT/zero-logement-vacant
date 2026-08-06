{{
config (
    materialized = 'table',
    unique_key = 'establishment_id',
)
}}

-- Marts: Establishment-level ZLV usage metrics
-- Contains only fields referenced in fields_usage_establishments.csv
-- Excludes activation/pro-activity derived typologies
--
-- Règle d'attribution: tout compteur d'activité provient d'un ÉVÉNEMENT créé par
-- un utilisateur de l'établissement. Le territoire (geo_code) ne sert qu'aux
-- référentiels (parc, région, département, échelons) et, pour les événements
-- portant sur un propriétaire, de filtre d'assiette. Voir
-- docs/decisions/20260805163000-attribution-des-metriques-d-usage-par-evenement-utilisateur.md
--
-- NE PAS SOMMER entre établissements les colonnes `logements_*`: un même
-- logement peut être compté par plusieurs établissements (deux collectivités
-- peuvent l'avoir mis à jour toutes les deux).

{% set first_year = 2020 %}
{% set last_year = modules.datetime.date.today().year %}
{% set years = range(first_year, last_year + 1) | list %}

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
    eu.logements_maj_owners_rank,
    eu.logements_maj_owners_address,
    eu.logements_maj_dpe,
    eu.date_derniere_maj_dpe,
    eu.logements_maj_notes,
    eu.logements_maj_documents,
    eu.actes_enrichissement,

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
    eu.exports_groupes,
    eu.groupes_exportes,
    eu.groupes_crees,
    eu.date_dernier_groupe_cree,

    -- =====================================================
    -- CAMPAGNES
    -- =====================================================
    eu.logements_contactes_via_campagnes,
    eu.contacts_campagnes,
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
    -- NULL quand l'échelon ne s'applique pas à l'établissement mesuré.
    eu.total_communes_in_territory,
    eu.communes_inscrites,
    eu.communes_inscrites_pct,
    eu.intercommunalites_inscrites,
    eu.intercommunalites_couvrant_le_perimetre,
    eu.intercommunalites_inscrites_pct,
    eu.departements_inscrits,
    eu.departements_couvrant_le_perimetre,
    eu.departements_inscrits_pct,
    eu.sded_inscrits,
    eu.sded_couvrant_le_perimetre,
    eu.sded_inscrits_pct,

    -- =====================================================
    -- MILLESIMES
    -- =====================================================
    -- Compteurs distincts À L'INTÉRIEUR de chaque année: un logement recontacté
    -- en 2023 puis en 2025 compte dans les deux. La somme des années est donc
    -- supérieure ou égale au total toutes années — ne pas l'utiliser comme total.
    {% for year in years %}
    eu.logements_contactes_via_campagnes_{{ year }},
    eu.logements_exportes_via_groupes_{{ year }}{{ "," if not loop.last }}
    {% endfor %}

FROM {{ ref('int_analysis_establishments_zlv_usage') }} eu
