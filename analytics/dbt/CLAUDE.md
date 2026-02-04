# Projet dbt ZLV - Guide pour Agents IA

## Vue d'ensemble

Ce projet dbt (`zlv_dbt_project`) est le pipeline de données analytiques pour **Zéro Logement Vacant (ZLV)**, une application française de lutte contre la vacance des logements.

**Stack technique** : DuckDB + MotherDuck (cloud)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SOURCES BRUTES                                      │
│  production (PostgreSQL ZLV) │ external (INSEE, DGFIP, CEREMA) │ LOVAC/FF      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STAGING (schema: stg)                                  │
│  Extraction directe des sources avec minimal transformation                      │
│  Préfixe: stg_                                                                   │
│  Matérialisation: VIEW                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INTERMEDIATE (schema: int)                               │
│  Transformations métier, jointures, agrégations                                  │
│  Préfixe: int_                                                                   │
│  Matérialisation: VIEW                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MARTS (schema: marts)                                 │
│  Tables analytiques finales pour reporting et BI                                 │
│  Préfixe: marts_                                                                 │
│  Matérialisation: TABLE                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Structure des dossiers

```
analytics/dbt/
├── models/
│   ├── staging/           # Sources brutes (stg_*)
│   │   ├── production/    # Données de l'app ZLV
│   │   ├── external/      # INSEE, DGFIP, DGALN, CEREMA
│   │   ├── lovac/         # Base des logements vacants (2019-2025)
│   │   └── ff/            # Fichiers Fonciers
│   ├── intermediate/      # Transformations (int_*)
│   │   ├── production/    # Événements, statuts, campagnes
│   │   ├── analysis/      # Features pour analyse
│   │   └── lovac/         # Traitement LOVAC
│   └── marts/             # Tables finales (marts_*)
│       ├── production/    # Housing, Campaigns, Establishments
│       ├── analysis/      # Tables BI pour impact analysis
│       └── stats/         # Statistiques mensuelles
├── macros/                # Macros SQL réutilisables
│   ├── production/events/ # Calcul des derniers statuts
│   └── lovac/             # Traitement LOVAC
├── tests/                 # Tests SQL custom
│   ├── production/        # Tests par domaine
│   │   ├── events/        # Tests événements
│   │   ├── campaign/      # Tests campagnes
│   │   ├── housing_status/# Tests statuts logements
│   │   ├── establishment/ # Tests établissements
│   │   └── stats/         # Tests KPI régression
│   └── data_quality/      # Tests qualité données
├── seeds/                 # Données statiques de référence
└── analyses/              # Requêtes ad-hoc
```

## Conventions de nommage

### Modèles

```
{couche}_{domaine}_{entité}_{suffixe_optionnel}
```

| Couche | Préfixe | Exemple |
|--------|---------|---------|
| Staging | `stg_` | `stg_production_housing` |
| Intermediate | `int_` | `int_production_housing_last_status` |
| Marts | `marts_` | `marts_production_housing` |

### Domaines

- `production` : Données de l'application ZLV
- `external` : Sources externes (INSEE, DGFIP, CEREMA)
- `lovac` : Base des logements vacants
- `ff` : Fichiers Fonciers
- `analysis` : Modèles analytiques
- `common` : Référentiels partagés

## Sources de données

### Production (app ZLV)

| Table | Description |
|-------|-------------|
| `housing` | Logements suivis |
| `owners` | Propriétaires |
| `establishments` | Collectivités territoriales |
| `campaigns` | Campagnes de contact |
| `events` | Événements (mises à jour statut/occupation) |
| `users` | Utilisateurs de l'app |
| `groups` | Groupes de logements |

### External

| Source | Tables |
|--------|--------|
| INSEE | COG, densité, recensement |
| DGFIP | Fiscalité locale |
| DGALN | Zonage ABC, carte des loyers |
| CEREMA | Prix/volumes transactions |

### LOVAC / FF

- **LOVAC** : Base annuelle des logements vacants (2019-2025)
- **FF** : Fichiers Fonciers 2024 (housing, owners, buildings)

## Commandes essentielles

```bash
# Naviguer vers le dossier dbt
cd analytics/dbt

# Exécuter tous les modèles
dbt run

# Exécuter un modèle spécifique et ses dépendances
dbt run --select +marts_production_housing

# Exécuter les tests
dbt test

# Exécuter les tests d'un modèle spécifique
dbt test --select marts_production_housing

# Générer la documentation
dbt docs generate
dbt docs serve

# Vérifier la syntaxe SQL
dbt compile --select marts_production_housing
```

## Modèles clés

### `int_production_housing_last_status`

Calcule le dernier statut par logement pour 6 catégories :
- `zlv_followup` : Suivi par l'app ZLV
- `user_followup` : Suivi par utilisateur
- `all_followup` : Tous les suivis
- `zlv_occupancy` / `user_occupancy` / `all_occupancy` : Idem pour occupation

### `marts_production_housing`

Table principale avec 136 colonnes incluant :
- Données du logement (surface, année, DPE)
- Derniers statuts
- Territoires spéciaux (OPAH, TLV, Action Cœur de Ville)
- Métriques campagnes

### `marts_bi_housing_complete`

Table d'analyse pour mesurer l'impact ZLV avec :
- `is_housing_out` : Sortie de vacance (0/1)
- `was_contacted_by_zlv` : Contacté par ZLV
- Features propriétaires, territoires, engagement ZLV

## Macros importantes

### `get_last_event_status(user_source, event_name)`

Filtre et ordonne les événements pour récupérer le dernier statut.

```sql
{{ get_last_event_status('user', 'suivi') }}
```

### `select_last_event(ref, cte_name, suffix)`

Sélectionne le dernier événement (row_num = 1).

## Tests

### Catégories de tests

1. **Validité des valeurs** : `accepted_values`, bornes
2. **Cohérence** : Relations entre colonnes
3. **Intégrité référentielle** : Relations entre tables
4. **Régression KPI** : Seuils minimum attendus

### Exécution

```bash
# Tous les tests
dbt test

# Tests d'un dossier
dbt test --select tests/production/events/*

# Tests d'un modèle
dbt test --select int_production_housing_last_status
```

## Connexion MotherDuck

Le projet utilise MotherDuck en production. Base de données : `dwh`

Schémas :
- `main_marts` : Tables marts
- `main_int` : Tables intermediate
- `external` : Sources externes
- `production` : Sources production

## Fichiers de configuration

| Fichier | Description |
|---------|-------------|
| `dbt_project.yml` | Configuration principale |
| `profiles.yml` | Connexion DuckDB/MotherDuck |
| `packages.yml` | Packages dbt (dbt_utils, dbt_expectations) |

## Ressources complémentaires

- [README_EVENTS_FLOW.md](models/intermediate/production/README_EVENTS_FLOW.md) - Architecture événements
- [CLAUDE.md](models/marts/analysis/CLAUDE.md) - Guide analyse sortie de vacance
