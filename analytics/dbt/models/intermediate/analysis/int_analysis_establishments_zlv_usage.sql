{{
config (
    materialized = 'table',
)
}}

-- Intermediate model: Establishment-level ZLV usage metrics
-- Aggregates housing updates, campaigns, groups, documents, enrichment events
-- per establishment for BI reporting at establishment granularity
-- Joined back to housing-level in marts_bi_housing_zlv_usage

WITH establishment_base AS (
    SELECT
        CAST(e.establishment_id AS VARCHAR) AS establishment_id,
        e.name AS nom,
        CASE WHEN e.available AND COALESCE(e.user_number, 0) > 0 THEN TRUE ELSE FALSE END AS ouvert,
        e.first_activated_at AS date_ouverture,
        EXTRACT(YEAR FROM e.first_activated_at) AS annee_ouverture,
        COALESCE(e.user_number, 0) AS utilisateurs_inscrits,
        e.last_authenticated_at AS date_derniere_connexion,
        COALESCE(e.connected_last_30_days, FALSE) AS connecte_30_jours,
        COALESCE(e.connected_last_60_days, FALSE) AS connecte_60_jours,
        COALESCE(e.connected_last_90_days, FALSE) AS connecte_90_jours,
        e.user_emails AS mails_utilisateurs,
        e.kind,
        COALESCE(e.has_campaigns, FALSE) AS has_campaigns,
        COALESCE(e.total_campaigns, 0) AS campagnes_creees,
        COALESCE(e.total_sent_campaigns, 0) AS campagnes_envoyees,
        COALESCE(e.total_exported_campaigns, 0) AS campagnes_exportees,
        e.first_campaign_created AS date_premiere_campagne_creee,
        e.last_campaign_created AS date_derniere_campagne_creee,
        COALESCE(e.is_creation_lt_30_days, 0) AS is_creation_lt_30_days,
        COALESCE(e.has_groups, FALSE) AS has_groups,
        COALESCE(e.total_groups, 0) AS groupes_crees,
        COALESCE(e.total_exported_groups, 0) AS groupes_exportes,
        e.last_group_created AS date_dernier_groupe_cree,
        COALESCE(e.has_perimeters, FALSE) AS has_perimeters,
        COALESCE(e.total_perimeters, 0) AS perimetres_importes,
        COALESCE(e.total_shapes, 0) AS couches_perimetres_importes,
        ea.connecte_90_derniers_jours,
        ea.connecte_60_derniers_jours,
        ea.connecte_30_derniers_jours,
        ea.a_depose_1_perimetre,
        ea.a_cree_1_groupe,
        ea.a_cree_1_campagne,
        ea.a_envoye_1_campagne,
        ea.a_fait_1_maj_suivi,
        ea.a_fait_1_maj_occupation,
        ea.a_fait_1_maj,
        ea.a_fait_1_campagne_ET_1_maj,
        ea.typologie_activation_simple,
        ea.typologie_activation_detaillee,
        ea.type_regroupe AS type_simple,
        ea.type_explicite AS type_detaille,
        epa.kind_pro_activity_quantile,
        epa.kind_pro_activity_ntile,
        COALESCE(epa.total_pro_activity_quantile, 0) AS total_pro_activity_score,
        epa.housing_rate_contacted_2024,
        epa.housing_vacant_rate_contacted_2024
    FROM {{ ref('marts_production_establishments') }} e
    LEFT JOIN {{ ref('marts_production_establishments_activation') }} ea
        ON e.establishment_id = ea.establishment_id
    LEFT JOIN {{ ref('marts_production_establishments_category_pro_activity') }} epa
        ON e.establishment_id = epa.establishment_id
    WHERE e.kind IS NOT NULL
),

establishment_connexions AS (
    SELECT
        u.establishment_id,
        COUNT(*) FILTER (WHERE u.last_authenticated_at > NOW() - INTERVAL '30 days') AS connexions_30_jours,
        COUNT(*) FILTER (WHERE u.last_authenticated_at > NOW() - INTERVAL '60 days') AS connexions_60_jours,
        COUNT(*) FILTER (WHERE u.last_authenticated_at > NOW() - INTERVAL '90 days') AS connexions_90_jours
    FROM {{ ref('int_production_users') }} u
    WHERE u.deleted_at IS NULL
    GROUP BY u.establishment_id
),

-- =====================================================================
-- LOGEMENTS MIS A JOUR (SITUATION / SUIVI / OCCUPATION)
-- =====================================================================
-- Attribution par ÉVÉNEMENT, lié à l'établissement de l'UTILISATEUR qui a
-- créé l'événement (int_production_events.establishment_id), et NON par
-- territoire géographique du logement.
--
-- L'ancienne version partait de int_production_establishments_housing
-- (logement -> établissement par geo_code) joint à
-- int_production_housing_last_status (dernier statut du logement, toutes
-- sources confondues). Conséquence: la mise à jour d'un logement était
-- comptée pour TOUS les établissements couvrant son territoire (commune +
-- EPCI + département + région + DDT...), soit ~25 établissements par
-- logement, et attribuée même quand l'utilisateur appartenait à un autre
-- établissement. Sur-comptage d'un facteur ~28 et ~36 000 établissements
-- crédités au lieu de ~600 réellement actifs.
--
-- On recalcule donc le dernier statut par (établissement, logement) à partir
-- des seuls événements créés par les utilisateurs ('user') de l'établissement.
-- Logique alignée sur la macro get_last_event_status / int_production_housing_last_status.

user_followup_last AS (
    SELECT
        establishment_id,
        housing_id,
        event_status_label,
        new_sub_status,
        created_at
    FROM (
        SELECT
            establishment_id,
            housing_id,
            event_status_label,
            new_sub_status,
            created_at,
            ROW_NUMBER() OVER (
                PARTITION BY establishment_id, housing_id
                ORDER BY created_at DESC
            ) AS row_num
        FROM {{ ref('int_production_events') }}
        WHERE user_source = 'user'
          AND status_changed = TRUE
          AND type IN ('housing:status-updated', 'housing:occupancy-updated')
          AND establishment_id IS NOT NULL
          AND housing_id IS NOT NULL
    )
    WHERE row_num = 1
),

user_occupancy_last AS (
    SELECT
        establishment_id,
        housing_id,
        created_at
    FROM (
        SELECT
            establishment_id,
            housing_id,
            created_at,
            ROW_NUMBER() OVER (
                PARTITION BY establishment_id, housing_id
                ORDER BY created_at DESC
            ) AS row_num
        FROM {{ ref('int_production_events') }}
        WHERE user_source = 'user'
          AND occupancy_changed = TRUE
          AND type IN ('housing:status-updated', 'housing:occupancy-updated')
          AND establishment_id IS NOT NULL
          AND housing_id IS NOT NULL
    )
    WHERE row_num = 1
),

followup_counts AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_suivi,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Non-suivi' THEN housing_id
        END) AS logements_maj_non_suivi,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'En attente de retour' THEN housing_id
        END) AS logements_maj_en_attente,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Premier contact' THEN housing_id
        END) AS logements_maj_premier_contact,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Suivi en cours' THEN housing_id
        END) AS logements_maj_suivi_en_cours,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Suivi terminé' THEN housing_id
        END) AS logements_maj_suivi_termine,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Suivi terminé'
              AND new_sub_status IN (
                  'Sortie de la vacance',
                  'Sortie de la passoire énergétique',
                  'Sortie de la passoire thermique',
                  'Autre objectif rempli'
              )
            THEN housing_id
        END) AS logements_maj_suivi_termine_sortis,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Suivi terminé'
              AND new_sub_status IN (
                  'N''était pas vacant',
                  'N''était pas une passoire énergétique',
                  'N''était pas une passoire thermique'
              )
            THEN housing_id
        END) AS logements_maj_suivi_termine_fiabilises,
        COUNT(DISTINCT CASE
            WHEN event_status_label = 'Bloqué' THEN housing_id
        END) AS logements_maj_bloque,
        MIN(created_at) AS first_followup_at,
        MAX(created_at) AS last_followup_at
    FROM user_followup_last
    GROUP BY establishment_id
),

occupancy_counts AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_occupation,
        MIN(created_at) AS first_occupancy_at,
        MAX(created_at) AS last_occupancy_at
    FROM user_occupancy_last
    GROUP BY establishment_id
),

situation_counts AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_situation
    FROM (
        SELECT establishment_id, housing_id FROM user_followup_last
        UNION
        SELECT establishment_id, housing_id FROM user_occupancy_last
    )
    GROUP BY establishment_id
),

housing_status_counts AS (
    SELECT
        COALESCE(f.establishment_id, o.establishment_id, s.establishment_id) AS establishment_id,
        COALESCE(s.logements_maj_situation, 0) AS logements_maj_situation,
        COALESCE(o.logements_maj_occupation, 0) AS logements_maj_occupation,
        COALESCE(f.logements_maj_suivi, 0) AS logements_maj_suivi,
        COALESCE(f.logements_maj_non_suivi, 0) AS logements_maj_non_suivi,
        COALESCE(f.logements_maj_en_attente, 0) AS logements_maj_en_attente,
        COALESCE(f.logements_maj_premier_contact, 0) AS logements_maj_premier_contact,
        COALESCE(f.logements_maj_suivi_en_cours, 0) AS logements_maj_suivi_en_cours,
        COALESCE(f.logements_maj_suivi_termine, 0) AS logements_maj_suivi_termine,
        COALESCE(f.logements_maj_suivi_termine_sortis, 0) AS logements_maj_suivi_termine_sortis,
        COALESCE(f.logements_maj_suivi_termine_fiabilises, 0) AS logements_maj_suivi_termine_fiabilises,
        COALESCE(f.logements_maj_bloque, 0) AS logements_maj_bloque,
        -- DuckDB LEAST/GREATEST ignorent les NULL: si une seule des deux dates
        -- existe (suivi OU occupation), la date renvoyée reste cohérente.
        LEAST(f.first_followup_at, o.first_occupancy_at) AS date_premiere_maj_situation,
        GREATEST(f.last_followup_at, o.last_occupancy_at) AS date_derniere_maj_situation
    FROM followup_counts f
    FULL OUTER JOIN occupancy_counts o
        ON f.establishment_id = o.establishment_id
    FULL OUTER JOIN situation_counts s
        ON COALESCE(f.establishment_id, o.establishment_id) = s.establishment_id
),

-- =====================================================================
-- ENRICHISSEMENT
-- =====================================================================
-- Même règle d'attribution que ci-dessus: l'événement est rattaché à
-- l'établissement de son AUTEUR (via int_production_event_authors, utilisateurs
-- supprimés inclus).
--
-- Particularité des événements 'owner:updated': ils portent sur un
-- PROPRIÉTAIRE, pas sur un logement, et se déplient donc sur tous les logements
-- de ce propriétaire — y compris ceux situés hors du territoire de
-- l'établissement (57% des paires mesurées). On intersecte donc avec le
-- périmètre de l'établissement: le géo n'est pas ici un mode d'attribution mais
-- un filtre d'assiette. Sens retenu: "logements de mon territoire dont j'ai
-- enrichi le propriétaire".

owner_enrichment_pairs AS (
    SELECT
        CAST(ou.establishment_id AS VARCHAR) AS establishment_id,
        ooh.housing_id,
        oev.created_at,
        (oev.next_new ->> 'email') IS DISTINCT FROM (oev.next_old ->> 'email') AS mail_changed,
        (oev.next_new ->> 'phone') IS DISTINCT FROM (oev.next_old ->> 'phone') AS phone_changed,
        (oev.next_new ->> 'name') IS DISTINCT FROM (oev.next_old ->> 'name') AS name_changed,
        (
            (oev.next_new ->> 'address') IS DISTINCT FROM (oev.next_old ->> 'address')
            OR (oev.next_new ->> 'additionalAddress') IS DISTINCT FROM (oev.next_old ->> 'additionalAddress')
        ) AS address_changed
    FROM {{ ref('stg_production_owner_events') }} oe
    JOIN {{ ref('stg_production_events') }} oev ON oe.event_id = oev.id
    JOIN {{ ref('stg_production_owners_housing') }} ooh ON oe.owner_id = ooh.owner_id
    JOIN {{ ref('int_production_event_authors') }} ou ON oev.created_by = ou.id
    JOIN {{ ref('int_production_establishments_housing') }} oeh
        ON ooh.housing_id = oeh.housing_id
       AND CAST(oeh.establishment_id AS VARCHAR) = CAST(ou.establishment_id AS VARCHAR)
    WHERE oev.type = 'owner:updated'
      AND ou.user_type = 'user'
),

owner_enrichment_events AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT CASE WHEN mail_changed THEN housing_id END) AS logements_maj_mails,
        COUNT(DISTINCT CASE WHEN phone_changed THEN housing_id END) AS logements_maj_phone,
        COUNT(DISTINCT CASE WHEN name_changed THEN housing_id END) AS logements_maj_owners,
        COUNT(DISTINCT CASE WHEN address_changed THEN housing_id END) AS logements_maj_owners_address
    FROM owner_enrichment_pairs
    GROUP BY establishment_id
),

rank_change_pairs AS (
    SELECT
        CAST(ru.establishment_id AS VARCHAR) AS establishment_id,
        rhe.housing_id,
        rev.created_at
    FROM {{ ref('stg_production_housing_events') }} rhe
    JOIN {{ ref('stg_production_events') }} rev ON rhe.event_id = rev.id
    JOIN {{ ref('int_production_event_authors') }} ru ON rev.created_by = ru.id
    JOIN {{ ref('int_production_establishments_housing') }} reh
        ON rhe.housing_id = reh.housing_id
       AND CAST(reh.establishment_id AS VARCHAR) = CAST(ru.establishment_id AS VARCHAR)
    WHERE rev.type = 'housing:owner-updated'
      AND ru.user_type = 'user'
      AND (rev.next_new ->> 'rank') IS DISTINCT FROM (rev.next_old ->> 'rank')
),

rank_change_events AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_owners_rank
    FROM rank_change_pairs
    GROUP BY establishment_id
),

notes_pairs AS (
    SELECT
        CAST(n.establishment_id AS VARCHAR) AS establishment_id,
        n.housing_id,
        n.created_at
    FROM {{ ref('int_production_notes') }} n
    WHERE n.user_type = 'user'
      AND n.deleted_at IS NULL
      AND n.establishment_id IS NOT NULL
      AND n.housing_id IS NOT NULL
),

notes_stats AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_notes
    FROM notes_pairs
    GROUP BY establishment_id
),

document_pairs AS (
    SELECT
        CAST(du.establishment_id AS VARCHAR) AS establishment_id,
        hde.housing_id,
        dev.created_at
    FROM {{ ref('stg_production_housing_document_events') }} hde
    JOIN {{ ref('stg_production_events') }} dev ON hde.event_id = dev.id
    JOIN {{ ref('int_production_event_authors') }} du ON dev.created_by = du.id
    WHERE du.user_type = 'user'
      AND du.establishment_id IS NOT NULL
),

document_stats AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_documents,
        COUNT(*) AS documents_importes,
        MAX(created_at) AS date_dernier_document_importe
    FROM document_pairs
    GROUP BY establishment_id
),

-- Mise à jour du DPE constaté par un utilisateur. La colonne
-- `housing.actual_dpe` (migration de janvier 2026) ne porte ni date ni auteur:
-- on part donc de l'événement 'housing:updated' qui trace la modification.
-- Volumétrie faible et attendue: la fonctionnalité est récente et peu utilisée.
dpe_pairs AS (
    SELECT
        CAST(pu.establishment_id AS VARCHAR) AS establishment_id,
        phe.housing_id,
        pev.created_at
    FROM {{ ref('stg_production_housing_events') }} phe
    JOIN {{ ref('stg_production_events') }} pev ON phe.event_id = pev.id
    JOIN {{ ref('int_production_event_authors') }} pu ON pev.created_by = pu.id
    WHERE pev.type = 'housing:updated'
      AND (pev.next_new ->> 'actualEnergyConsumption')
          IS DISTINCT FROM (pev.next_old ->> 'actualEnergyConsumption')
      AND pu.user_type = 'user'
      AND pu.establishment_id IS NOT NULL
),

dpe_stats AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_dpe,
        MAX(created_at) AS date_derniere_maj_dpe
    FROM dpe_pairs
    GROUP BY establishment_id
),

-- Agrégat d'enrichissement: logements DISTINCTS touchés par au moins une des
-- familles d'enrichissement. À ne pas confondre avec la somme des familles, qui
-- compte des ACTES (un logement dont le mail ET le téléphone ont été corrigés y
-- compterait deux fois).
enrichment_union AS (
    SELECT establishment_id, housing_id, created_at FROM owner_enrichment_pairs
    UNION
    SELECT establishment_id, housing_id, created_at FROM rank_change_pairs
    UNION
    SELECT establishment_id, housing_id, created_at FROM notes_pairs
    UNION
    SELECT establishment_id, housing_id, created_at FROM document_pairs
    UNION
    SELECT establishment_id, housing_id, created_at FROM dpe_pairs
),

enrichment_counts AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT housing_id) AS logements_maj_enrichissement,
        COUNT(*) AS actes_enrichissement,
        MIN(created_at) AS date_premiere_maj_enrichissement,
        MAX(created_at) AS date_derniere_maj_enrichissement
    FROM enrichment_union
    GROUP BY establishment_id
),

-- =====================================================================
-- CAMPAGNES / GROUPES
-- =====================================================================
-- `logements_*` compte des logements DISTINCTS (un logement présent dans
-- plusieurs campagnes ou plusieurs groupes ne compte qu'une fois).
-- `contacts_campagnes` / `exports_groupes` gardent la volumétrie brute, utile
-- comme mesure d'effort.

campaign_housing_stats AS (
    SELECT
        CAST(pc.establishment_id AS VARCHAR) AS establishment_id,
        COUNT(DISTINCT pch.housing_id) AS logements_contactes_via_campagnes,
        COUNT(pch.housing_id) AS contacts_campagnes
    FROM {{ ref('int_production_campaigns') }} pc
    JOIN {{ ref('int_production_campaigns_housing') }} pch ON pc.campaign_id = pch.campaign_id
    WHERE pc.sent_at IS NOT NULL
    GROUP BY pc.establishment_id
),

group_housing_stats AS (
    SELECT
        CAST(pg.establishment_id AS VARCHAR) AS establishment_id,
        COUNT(DISTINCT phg.housing_id) AS logements_exportes_via_groupes,
        COUNT(phg.housing_id) AS exports_groupes
    FROM {{ ref('stg_production_groups') }} pg
    JOIN {{ ref('stg_production_groups_housing') }} phg ON pg.id = phg.group_id
    WHERE pg.exported_at IS NOT NULL
    GROUP BY pg.establishment_id
),

housing_park_counts AS (
    SELECT
        el.establishment_id,
        SUM(CASE WHEN mcm.year = 2025 THEN mcm.count_vacant_housing_private_fil_public ELSE 0 END) AS parc_vacant_lovac_25,
        SUM(CASE WHEN mcm.year = 2024 THEN mcm.count_housing_private_rented ELSE 0 END) AS parc_locatif_ff_24
    FROM {{ ref('int_production_establishments_localities') }} el
    JOIN {{ ref('marts_common_morphology') }} mcm ON el.geo_code = mcm.geo_code
    WHERE mcm.year IN (2024, 2025)
    GROUP BY el.establishment_id
),

geo_reference AS (
    SELECT DISTINCT ON (el.establishment_id)
        el.establishment_id,
        mcm.region_label AS region,
        mcm.dep_label AS departement
    FROM {{ ref('int_production_establishments_localities') }} el
    JOIN {{ ref('marts_common_morphology') }} mcm ON el.geo_code = mcm.geo_code
    WHERE mcm.year = 2025
      AND mcm.region_label IS NOT NULL
),

-- Millésimes exposés en colonnes larges: de la première campagne envoyée
-- (2020) à l'année courante. Liste calculée à la compilation pour ne pas avoir
-- à rouvrir le modèle chaque 1er janvier.
{% set first_year = 2020 %}
{% set last_year = modules.datetime.date.today().year %}
{% set years = range(first_year, last_year + 1) | list %}

annual_pivot AS (
    SELECT
        establishment_id,
        {% for year in years %}
        COALESCE(SUM(CASE WHEN annee = {{ year }} THEN logements_contactes_via_campagnes END), 0)
            AS logements_contactes_via_campagnes_{{ year }},
        COALESCE(SUM(CASE WHEN annee = {{ year }} THEN logements_exportes_via_groupes END), 0)
            AS logements_exportes_via_groupes_{{ year }}{{ "," if not loop.last }}
        {% endfor %}
    FROM {{ ref('int_analysis_establishments_zlv_usage_annuel') }}
    GROUP BY establishment_id
)

SELECT
    eb.establishment_id,

    -- =====================================================
    -- DIMENSIONS
    -- =====================================================
    eb.nom,
    eb.ouvert,
    eb.date_ouverture,
    eb.annee_ouverture,

    -- =====================================================
    -- UTILISATEURS / CONNEXIONS
    -- =====================================================
    eb.utilisateurs_inscrits,
    eb.date_derniere_connexion,
    eb.connecte_30_jours,
    eb.connecte_60_jours,
    eb.connecte_90_jours,
    COALESCE(ec.connexions_30_jours, 0) AS connexions_30_jours,
    COALESCE(ec.connexions_60_jours, 0) AS connexions_60_jours,
    COALESCE(ec.connexions_90_jours, 0) AS connexions_90_jours,

    -- =====================================================
    -- LOGEMENTS MIS A JOUR - SITUATION (Suivi + Occupation)
    -- =====================================================
    COALESCE(hsc.logements_maj_situation, 0) > 0 AS a_1_logement_maj_situation,
    COALESCE(hsc.logements_maj_occupation, 0) > 0 AS a_1_logement_maj_occupation,
    COALESCE(hsc.logements_maj_suivi, 0) > 0 AS a_1_logement_maj_suivi,
    COALESCE(hsc.logements_maj_situation, 0) AS logements_maj_situation,
    COALESCE(hsc.logements_maj_occupation, 0) AS logements_maj_occupation,
    COALESCE(hsc.logements_maj_suivi, 0) AS logements_maj_suivi,
    COALESCE(hsc.logements_maj_non_suivi, 0) AS logements_maj_non_suivi,
    COALESCE(hsc.logements_maj_en_attente, 0) AS logements_maj_en_attente,
    COALESCE(hsc.logements_maj_premier_contact, 0) AS logements_maj_premier_contact,
    COALESCE(hsc.logements_maj_suivi_en_cours, 0) AS logements_maj_suivi_en_cours,
    COALESCE(hsc.logements_maj_suivi_termine, 0) AS logements_maj_suivi_termine,
    COALESCE(hsc.logements_maj_suivi_termine_sortis, 0) AS logements_maj_suivi_termine_sortis,
    COALESCE(hsc.logements_maj_suivi_termine_fiabilises, 0) AS logements_maj_suivi_termine_fiabilises,
    COALESCE(hsc.logements_maj_bloque, 0) AS logements_maj_bloque,
    hsc.date_premiere_maj_situation,
    hsc.date_derniere_maj_situation,

    CASE
        WHEN COALESCE(hpc.parc_vacant_lovac_25, 0) > 0
        THEN ROUND(COALESCE(hsc.logements_maj_situation, 0)::FLOAT / hpc.parc_vacant_lovac_25 * 100, 2)
        ELSE NULL
    END AS logements_maj_situation_pct_parc_vacant_25,

    CASE
        WHEN COALESCE(hpc.parc_locatif_ff_24, 0) > 0
        THEN ROUND(COALESCE(hsc.logements_maj_situation, 0)::FLOAT / hpc.parc_locatif_ff_24 * 100, 2)
        ELSE NULL
    END AS logements_maj_situation_pct_parc_locatif_24,

    -- =====================================================
    -- LOGEMENTS MIS A JOUR - ENRICHISSEMENT
    -- =====================================================
    COALESCE(enc.logements_maj_enrichissement, 0) > 0 AS a_1_logement_maj_enrichissement,

    -- Logements distincts touchés par au moins une famille d'enrichissement.
    COALESCE(enc.logements_maj_enrichissement, 0) AS logements_maj_enrichissement,
    -- Volumétrie d'actes: somme des interventions, un logement pouvant en
    -- porter plusieurs. Toujours >= logements_maj_enrichissement.
    COALESCE(enc.actes_enrichissement, 0) AS actes_enrichissement,

    COALESCE(oee.logements_maj_mails, 0) AS logements_maj_mails,
    COALESCE(oee.logements_maj_phone, 0) AS logements_maj_phone,
    COALESCE(oee.logements_maj_owners, 0) AS logements_maj_owners,
    COALESCE(rce.logements_maj_owners_rank, 0) AS logements_maj_owners_rank,
    COALESCE(oee.logements_maj_owners_address, 0) AS logements_maj_owners_address,
    COALESCE(dpes.logements_maj_dpe, 0) AS logements_maj_dpe,
    dpes.date_derniere_maj_dpe,
    COALESCE(ns.logements_maj_notes, 0) AS logements_maj_notes,
    COALESCE(ds.logements_maj_documents, 0) AS logements_maj_documents,

    enc.date_premiere_maj_enrichissement,
    enc.date_derniere_maj_enrichissement,

    -- =====================================================
    -- DOCUMENTS
    -- =====================================================
    COALESCE(ds.documents_importes, 0) AS documents_importes,
    ds.date_dernier_document_importe,

    -- =====================================================
    -- GROUPES
    -- =====================================================
    eb.has_groups AS a_1_groupe_cree,
    COALESCE(ghs.logements_exportes_via_groupes, 0) AS logements_exportes_via_groupes,
    COALESCE(ghs.exports_groupes, 0) AS exports_groupes,
    eb.groupes_exportes,
    eb.groupes_crees,
    eb.date_dernier_groupe_cree,

    -- =====================================================
    -- CAMPAGNES
    -- =====================================================
    COALESCE(chs.logements_contactes_via_campagnes, 0) AS logements_contactes_via_campagnes,
    COALESCE(chs.contacts_campagnes, 0) AS contacts_campagnes,
    (eb.campagnes_envoyees > 0 AND COALESCE(hsc.logements_maj_situation, 0) > 0) AS a_1_campagne_envoyee_et_1_maj_situation,
    eb.has_campaigns AS a_1_campagne_creee,
    eb.is_creation_lt_30_days > 0 AS a_1_campagne_creee_30_jours,
    eb.campagnes_envoyees > 0 AS a_1_campagne_envoyee,
    eb.campagnes_envoyees,
    eb.campagnes_exportees,
    eb.campagnes_creees,
    eb.date_premiere_campagne_creee,
    eb.date_derniere_campagne_creee,

    -- =====================================================
    -- PERIMETRES
    -- =====================================================
    eb.has_perimeters AS a_1_perimetre_importe,
    eb.perimetres_importes,
    eb.couches_perimetres_importes,

    -- =====================================================
    -- REFERENTS COMPARATIFS
    -- =====================================================
    gr.region,
    gr.departement,
    eb.type_detaille,
    eb.type_simple,

    -- =====================================================
    -- PRISE DE CONTACT
    -- =====================================================
    eb.mails_utilisateurs,

    -- =====================================================
    -- ACTIVATION / PRO-ACTIVITY (carried over)
    -- =====================================================
    eb.connecte_90_derniers_jours,
    eb.connecte_60_derniers_jours,
    eb.connecte_30_derniers_jours,
    eb.a_depose_1_perimetre,
    eb.a_cree_1_groupe,
    eb.a_cree_1_campagne,
    eb.a_envoye_1_campagne,
    eb.a_fait_1_maj_suivi,
    eb.a_fait_1_maj_occupation,
    eb.a_fait_1_maj,
    eb.a_fait_1_campagne_ET_1_maj,
    eb.typologie_activation_simple,
    eb.typologie_activation_detaillee,
    CASE
        WHEN eb.typologie_activation_simple LIKE '(1)%' THEN 1
        WHEN eb.typologie_activation_simple LIKE '(2)%' THEN 2
        WHEN eb.typologie_activation_simple LIKE '(3)%' THEN 3
        WHEN eb.typologie_activation_simple LIKE '(4)%' THEN 4
        WHEN eb.typologie_activation_simple LIKE '(5)%' THEN 5
        ELSE 0
    END AS activation_level,
    eb.kind_pro_activity_quantile,
    eb.kind_pro_activity_ntile,
    eb.total_pro_activity_score,
    CASE
        WHEN eb.kind_pro_activity_ntile = 'Non pro-actif' THEN 1
        WHEN eb.kind_pro_activity_ntile = 'Peu pro-actif' THEN 2
        WHEN eb.kind_pro_activity_ntile = 'Pro-actif' THEN 3
        WHEN eb.kind_pro_activity_ntile = 'Très pro-actif' THEN 4
        ELSE 0
    END AS pro_activity_level,
    eb.housing_rate_contacted_2024,
    eb.housing_vacant_rate_contacted_2024,

    -- =====================================================
    -- ECHELONS INSCRITS
    -- =====================================================
    -- NULL (et non 0) lorsque l'échelon ne s'applique pas à cet établissement:
    -- voir int_production_establishments_echelons.
    ei.total_communes_in_territory,
    ei.communes_inscrites,
    ei.communes_inscrites_pct,
    ei.intercommunalites_inscrites,
    ei.intercommunalites_couvrant_le_perimetre,
    ei.intercommunalites_inscrites_pct,
    ei.departements_inscrits,
    ei.departements_couvrant_le_perimetre,
    ei.departements_inscrits_pct,
    ei.sded_inscrits,
    ei.sded_couvrant_le_perimetre,
    ei.sded_inscrits_pct,

    -- =====================================================
    -- MILLESIMES (colonnes larges)
    -- =====================================================
    -- Distinct À L'INTÉRIEUR de chaque année: ne pas sommer les années.
    {% for year in years %}
    COALESCE(ap.logements_contactes_via_campagnes_{{ year }}, 0)
        AS logements_contactes_via_campagnes_{{ year }},
    COALESCE(ap.logements_exportes_via_groupes_{{ year }}, 0)
        AS logements_exportes_via_groupes_{{ year }}{{ "," if not loop.last }}
    {% endfor %}

FROM establishment_base eb
LEFT JOIN establishment_connexions ec ON eb.establishment_id = CAST(ec.establishment_id AS VARCHAR)
LEFT JOIN housing_status_counts hsc ON eb.establishment_id = CAST(hsc.establishment_id AS VARCHAR)
LEFT JOIN owner_enrichment_events oee ON eb.establishment_id = CAST(oee.establishment_id AS VARCHAR)
LEFT JOIN rank_change_events rce ON eb.establishment_id = CAST(rce.establishment_id AS VARCHAR)
LEFT JOIN enrichment_counts enc ON eb.establishment_id = CAST(enc.establishment_id AS VARCHAR)
LEFT JOIN notes_stats ns ON eb.establishment_id = CAST(ns.establishment_id AS VARCHAR)
LEFT JOIN document_stats ds ON eb.establishment_id = CAST(ds.establishment_id AS VARCHAR)
LEFT JOIN campaign_housing_stats chs ON eb.establishment_id = CAST(chs.establishment_id AS VARCHAR)
LEFT JOIN group_housing_stats ghs ON eb.establishment_id = CAST(ghs.establishment_id AS VARCHAR)
LEFT JOIN dpe_stats dpes ON eb.establishment_id = CAST(dpes.establishment_id AS VARCHAR)
LEFT JOIN housing_park_counts hpc ON eb.establishment_id = CAST(hpc.establishment_id AS VARCHAR)
LEFT JOIN geo_reference gr ON eb.establishment_id = CAST(gr.establishment_id AS VARCHAR)
LEFT JOIN {{ ref('int_production_establishments_echelons') }} ei
    ON eb.establishment_id = ei.establishment_id
LEFT JOIN annual_pivot ap ON eb.establishment_id = ap.establishment_id
