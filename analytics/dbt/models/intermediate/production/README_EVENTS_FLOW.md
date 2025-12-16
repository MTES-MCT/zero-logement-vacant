# Documentation du Flux des Événements de Production

## Vue d'ensemble

Ce document décrit l'architecture complète du flux de données des événements dans le pipeline dbt, depuis les sources brutes jusqu'au mart final `marts_production_housing`.

## Architecture du DAG

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    SOURCES                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌─────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────────┐
│ stg_production_     │   │ stg_production_events   │   │ stg_production_housing_     │
│ old_events          │   │ (nouveau format JSON)   │   │ events / owner_events       │
│ (ancien format      │   │                         │   │ (tables de liaison)         │
│ texte)              │   │                         │   │                             │
└─────────────────────┘   └─────────────────────────┘   └─────────────────────────────┘
        │                               │                               │
        ▼                               ▼                               │
┌─────────────────────┐   ┌─────────────────────────┐                   │
│ int_production_     │   │ int_production_         │                   │
│ events_old          │   │ events_new              │◄──────────────────┘
│                     │   │                         │
│ - Parse le contenu  │   │ - Extrait les données   │
│   texte             │   │   JSON                  │
│ - type = NULL ⚠️    │   │ - type = 'housing:      │
│                     │   │   status-updated' etc.  │
└─────────────────────┘   └─────────────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
            ┌───────────────────────────┐
            │   int_production_events   │
            │                           │
            │   UNION DISTINCT des      │
            │   events_old et events_new│
            │                           │
            │   + JOIN avec:            │
            │   - int_production_users  │
            │   - status (seed)         │
            └───────────────────────────┘
                        │
                        ▼
            ┌───────────────────────────────────────────────────┐
            │        int_production_housing_last_status         │
            │                                                   │
            │   Utilise les macros:                             │
            │   - get_last_event_status()                       │
            │   - select_last_event()                           │
            │                                                   │
            │   Pour calculer 6 types de "dernier statut":      │
            │   - zlv_followup (suivi par ZLV)                  │
            │   - user_followup (suivi par utilisateur)         │
            │   - all_followup (tous les suivis)                │
            │   - zlv_occupancy (occupation par ZLV)            │
            │   - user_occupancy (occupation par utilisateur)   │
            │   - all_occupancy (toutes les occupations)        │
            └───────────────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────────────────────────────────┐
            │            marts_production_housing               │
            │                                                   │
            │   Table finale avec:                              │
            │   - Données du logement                           │
            │   - Derniers statuts de suivi et occupation       │
            │   - Territoires et zones                          │
            │   - Campagnes et groupes                          │
            └───────────────────────────────────────────────────┘
```

## Description des Modèles

### 1. Staging (Sources brutes)

#### `stg_production_old_events`

- **Source**: `duckdb_production_raw.old_events`
- **Description**: Anciens événements stockés dans un format texte (avant la migration)
- **Colonnes clés**: `id`, `housing_id`, `content`, `created_at`, `created_by`

#### `stg_production_events`

- **Source**: `duckdb_production_raw.events`
- **Description**: Nouveaux événements stockés en format JSON structuré
- **Colonnes clés**: `id`, `type`, `next_new`, `next_old`, `created_at`, `created_by`

#### `stg_production_housing_events` / `stg_production_owner_events`

- **Description**: Tables de liaison événement ↔ logement/propriétaire

### 2. Intermediate (Transformation)

#### `int_production_events_old`

- **Description**: Transforme les anciens événements texte en format structuré
- **Logique**: Parse le champ `content` pour extraire:
  - `new_status`: Code numérique (0-5) extrait via pattern matching
  - `new_sub_status`: Sous-statut (ex: "Sortie de la vacance")
  - `new_occupancy`: Nouveau statut d'occupation (V, P, L, inconnu)
- **⚠️ ATTENTION**: `type = NULL` pour ces événements

#### `int_production_events_new`

- **Description**: Transforme les nouveaux événements JSON
- **Logique**: Extrait directement depuis les champs JSON:
  - `next_new ->> 'status'`: Nouveau statut
  - `next_new ->> 'occupancy'`: Nouvelle occupation
- **Types d'événements**: `housing:status-updated`, `housing:occupancy-updated`

#### `int_production_events`

- **Description**: Union de tous les événements (anciens + nouveaux)
- **Enrichissement**:
  - `user_source`: 'zlv' ou 'user' (via `int_production_users`)
  - `event_status_label`: Label lisible (via seed `status`)
  - `establishment_id`: ID de l'établissement de l'utilisateur

#### `int_production_housing_last_status`

- **Description**: Calcule le dernier statut par logement et par catégorie
- **Macros utilisées**:
  - `get_last_event_status(user_source, event_name)`: Filtre et ordonne les événements
  - `select_last_event(...)`: Sélectionne le plus récent (row_num = 1)
- **Colonnes générées** (pour chaque catégorie zlv/user/all et suivi/occupation):
  - `last_event_status_*`: Code du statut
  - `last_event_status_label_*`: Label lisible
  - `last_event_date_*`: Date du dernier événement

### 3. Marts (Tables finales)

#### `marts_production_housing`

- **Description**: Table analytique principale des logements
- **Jointures**:
  - `int_production_housing`: Données du logement
  - `int_production_housing_last_status`: Derniers statuts
  - `marts_common_cities`: Territoires (OPAH, TLV, etc.)
  - `int_production_housing_campaigns`: Campagnes
  - `int_production_housing_groups`: Groupes
  - `int_production_housing_establishments`: Établissements
  - `int_production_housing_users`: Présence utilisateurs

## Mapping des Statuts

### Codes de Suivi (status)

| Code | Ancien Label | Nouveau Label |
|------|-------------|---------------|
| 0 | Jamais contacté | Non-suivi |
| 1 | En attente de retour | En attente de retour |
| 2 | Premier contact | Premier contact |
| 3 | Suivi en cours | Suivi en cours |
| 4 | Non-vacant | Suivi terminé |
| 5 | Bloqué | Bloqué |

### Codes d'Occupation

| Code | Signification |
|------|---------------|
| V | Vacant |
| P | Occupé par le propriétaire |
| L | En location |
| inconnu | Non déterminé |

## ⚠️ BUG IDENTIFIÉ (Novembre 2025)

### Description du problème

Le **10 novembre 2025** (commit `330f0e9c5`), un filtre a été ajouté dans la macro `get_last_event_status`:

```sql
AND events.type IN('housing:status-updated', 'housing:occupancy-updated')
```

**Impact**: Ce filtre exclut TOUS les anciens événements (`int_production_events_old`) car leur champ `type` est `NULL`.

### Symptômes observés

- Chute des indicateurs "Suivi en cours" + "Suivi terminé": 28 000 → 21 000
- Chute des "Mises à jour": 45 969 → 36 000

### Cause racine

Dans `int_production_events_old.sql` ligne 85:

```sql
NULL AS type
```

Les anciens événements n'ont pas de `type`, donc ils sont exclus par le nouveau filtre.

### Solution proposée

Modifier la macro `get_last_event_status.sql` pour inclure les événements sans type:

```sql
-- Avant (bugué):
AND events.type IN('housing:status-updated', 'housing:occupancy-updated')

-- Après (corrigé):
AND (
    events.type IN('housing:status-updated', 'housing:occupancy-updated')
    OR events.type IS NULL  -- Inclut les anciens événements
)
```

## Notes et Notes comme Événements

### `int_production_notes`

- **Description**: Notes associées aux logements/propriétaires
- **Source**: `stg_production_notes` avec exclusion des notes supprimées
- **Enrichissement**: `housing_id`, `owner_id`, `establishment_id`, `user_type`

### `int_production_notes_as_events`

- **Description**: Transformation des notes en "pseudo-événements"
- **Usage**: Permet de traiter les notes dans le même flux que les événements
- **Catégorie**: `'note'`

## Tests Recommandés

1. **Cohérence des événements**: Vérifier que les anciens événements sont bien inclus
2. **Non-régression des comptages**: Alerter si les KPIs chutent de plus de X%
3. **Intégrité référentielle**: Vérifier les liens housing_id ↔ événements
4. **Unicité**: Un seul "dernier statut" par logement et catégorie

## Requêtes de Diagnostic

### Compter les événements par type/version

```sql
SELECT 
    version,
    type,
    COUNT(*) as nb_events
FROM int_production_events
GROUP BY version, type
ORDER BY version, type;
```

### Vérifier les logements sans statut (après le bug)

```sql
SELECT COUNT(*) 
FROM int_production_housing h
LEFT JOIN int_production_housing_last_status hs ON h.id = hs.housing_id
WHERE hs.last_event_status_label_user_followup IS NULL
AND EXISTS (
    SELECT 1 FROM int_production_events e 
    WHERE e.housing_id = h.id 
    AND e.status_changed = TRUE
);
```


