# Skill: Travailler sur le projet dbt ZLV

Ce skill guide les agents IA pour travailler efficacement sur le projet dbt Zéro Logement Vacant.

## Contexte

Le projet dbt `zlv_dbt_project` est un pipeline de données analytiques pour l'application ZLV (Zéro Logement Vacant). Il utilise DuckDB/MotherDuck et suit l'architecture staging → intermediate → marts.

## Prérequis

- Accès à MotherDuck (base `dwh`)
- Python avec dbt-duckdb installé
- Connaissance de la structure du projet (voir `CLAUDE.md`)

## Tâches courantes

### 1. Explorer les données avec MotherDuck

Utilisez le MCP MotherDuck pour exécuter des requêtes. Les schémas sont :
- `dwh.main_marts` : Tables marts finales
- `dwh.main_int` : Tables intermediate
- `dwh.external` : Sources externes

```sql
-- Exemple: compter les logements par statut
SELECT last_event_status_label_user_followup, COUNT(*) 
FROM dwh.main_int.int_production_housing_last_status 
GROUP BY 1;
```

### 2. Ajouter un nouveau modèle

1. **Identifier la couche** : staging (`stg_`), intermediate (`int_`) ou marts (`marts_`)
2. **Créer le fichier SQL** dans le dossier approprié
3. **Utiliser les refs** : `{{ ref('nom_du_modele') }}`
4. **Documenter** dans `schema.yml` du même dossier

```sql
-- Exemple: models/intermediate/production/int_production_new_model.sql
SELECT 
    h.id,
    h.geo_code,
    ...
FROM {{ ref('int_production_housing') }} h
```

### 3. Ajouter un test

#### Test SQL custom (recommandé pour logique complexe)

Créer un fichier dans `tests/production/<domaine>/`:

```sql
-- tests/production/campaign/test_campaign_example.sql
-- La requête doit retourner les lignes en erreur (0 lignes = test réussi)

SELECT id, 'Description du problème' as issue
FROM {{ ref('marts_production_campaigns') }}
WHERE <condition_erreur>
```

#### Test dans schema.yml (pour validations simples)

```yaml
columns:
  - name: my_column
    tests:
      - unique
      - not_null
      - accepted_values:
          values: ['val1', 'val2']
```

### 4. Modifier un modèle existant

1. **Lire le modèle** et ses dépendances (`{{ ref() }}`)
2. **Vérifier les tests existants** dans `schema.yml` et `tests/`
3. **Tester localement** : `dbt run --select nom_du_modele`
4. **Exécuter les tests** : `dbt test --select nom_du_modele`

### 5. Comprendre le flux des événements

Le modèle `int_production_housing_last_status` est central. Il calcule 6 types de "dernier statut" :

| Catégorie | user_source | event_name |
|-----------|-------------|------------|
| `zlv_followup` | zlv | suivi |
| `user_followup` | user | suivi |
| `all_followup` | tous | suivi |
| `zlv_occupancy` | zlv | occupation |
| `user_occupancy` | user | occupation |
| `all_occupancy` | tous | occupation |

Voir `README_EVENTS_FLOW.md` pour le détail du DAG.

## Commandes dbt

```bash
cd analytics/dbt

# Exécuter tous les modèles
dbt run

# Exécuter un modèle et ses dépendances
dbt run --select +marts_production_housing

# Exécuter les tests
dbt test

# Tester un modèle spécifique
dbt test --select int_production_housing_last_status

# Compiler sans exécuter (vérifier la syntaxe)
dbt compile --select nom_du_modele

# Voir le lignage
dbt docs generate && dbt docs serve
```

## Requêtes MotherDuck utiles

### Métriques générales

```sql
-- Volume par table principale
SELECT 'housing' as table_name, COUNT(*) as count FROM dwh.main_marts.marts_production_housing
UNION ALL
SELECT 'establishments', COUNT(*) FROM dwh.main_marts.marts_production_establishments WHERE is_active
UNION ALL
SELECT 'campaigns', COUNT(*) FROM dwh.main_marts.marts_production_campaigns WHERE is_sent = 1;
```

### Diagnostic des événements

```sql
-- Événements par type et source
SELECT type, user_source, version, COUNT(*) 
FROM dwh.main_int.int_production_events 
WHERE type IN ('housing:status-updated', 'housing:occupancy-updated') OR type IS NULL
GROUP BY 1, 2, 3;
```

### Statuts de suivi

```sql
-- Distribution des statuts de suivi utilisateur
SELECT last_event_status_label_user_followup, COUNT(*) as count
FROM dwh.main_int.int_production_housing_last_status
WHERE last_event_status_label_user_followup IS NOT NULL
GROUP BY 1 ORDER BY 2 DESC;
```

### Campagnes et taux de retour

```sql
-- Statistiques des campagnes envoyées
SELECT 
    COUNT(*) as total_sent,
    AVG(housing_number_in_campaign) as avg_housing,
    AVG(return_rate_3_months) as avg_return_3m,
    AVG(return_rate_36_months) as avg_return_36m
FROM dwh.main_marts.marts_production_campaigns
WHERE is_sent = 1;
```

## Macros disponibles

### `get_last_event_status(user_source, event_name, all_users=false)`

Filtre et ordonne les événements pour récupérer le dernier par logement.

```sql
{{ get_last_event_status('user', 'suivi') }}
-- Retourne les événements de suivi par utilisateur avec row_number
```

### `select_last_event(ref, cte_name, suffix)`

Sélectionne le dernier événement (row_num = 1) et renomme les colonnes.

### `process_return_rate_for_campaigns(n_month, check_next_campaign)`

Calcule les taux de retour pour les campagnes.

## Fichiers de configuration

| Fichier | Description |
|---------|-------------|
| `dbt_project.yml` | Configuration générale, matérialisations par défaut |
| `profiles.yml` | Connexion DuckDB/MotherDuck |
| `packages.yml` | dbt_utils, dbt_expectations |

## Bonnes pratiques

1. **Nommer les modèles** : `{couche}_{domaine}_{entité}_{suffixe}`
2. **Documenter** chaque nouveau modèle dans `schema.yml`
3. **Tester** les colonnes critiques (unique, not_null, accepted_values)
4. **Commenter** la logique métier complexe en SQL
5. **Utiliser les refs** plutôt que les noms de tables bruts
6. **Valider** avec MotherDuck avant de committer

## Ressources

- `CLAUDE.md` : Guide complet du projet
- `docs/GLOSSAIRE_METIER.md` : Définitions des entités métier
- `models/intermediate/production/README_EVENTS_FLOW.md` : Architecture des événements
- `models/marts/analysis/CLAUDE.md` : Guide pour l'analyse de sortie de vacance
