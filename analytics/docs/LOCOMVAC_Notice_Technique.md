### Notice technique — Entrepôt de données ZLV (focus LOCOMVAC)

Cette notice décrit l’architecture, les flux, la sécurité et l’exploitation techniques pour l’intégration de LOCOMVAC dans l’entrepôt ZLV.

### Contexte et objectifs

- Centraliser LOCOMVAC (et données FF associées) dans DuckDB pour analyses.
- Normaliser les schémas, assurer la qualité et la reproductibilité via dbt.
- Exposer des tables « marts » prêtes pour Metabase sans données personnelles inutiles.

### Stack et composants

- Orchestrateur: Dagster (`analytics/dagster/src`) — assets d’ingestion, de copie et de publication.
- Modélisation: dbt (`analytics/dbt/`) — couches `staging`, `intermediate`, `marts` avec tests et macros.
- Moteur analytique: DuckDB (fichiers `.duckdb`), extensions `httpfs`, `parquet`, `spatial`.
- Visualisation: Metabase (Docker), connecté au DuckDB analytique.

### Sources et ingestion

- Production applicative PostgreSQL (lecture seule): synchronisée vers `production.*` via DuckDB Postgres scanner.
  - Voir `ingest_postgres_asset.py` et `queries/production.py`.
- LOCOMVAC/FF (fichiers CSV): chargés depuis un stockage objet compatible S3 (Cellar) vers `lovac.*` et `ff.*`.
  - Voir `ingest_lovac_ff_s3_asset.py` et `ingest/queries/lovac.py`, `ff.py`.
- Secrets S3: créés côté DuckDB via `CREATE PERSISTENT SECRET` avec les variables `CELLAR_*`.

### Transformation (dbt)

- Couches:
  - `staging`: normalisation minimale, typage, renommage.
  - `intermediate`: logiques métier, jointures, historisation.
  - `marts`: tables finales prêtes pour BI et partage.
- Paramètres: `dbt_project.yml` configure schémas par couche (`stg`, `int`, `marts`).
- Paquets dbt: `dbt_utils`, `dbt_expectations`, `dbt_date`, `codegen`.
- Convention d’actifs Dagster/dbt: mapping de clés pour aligner sources « raw_* » et modèles.

### Exposition et distribution

- Tables cibles « marts_* » dans DuckDB analytique.
- Copie sélective vers une base DuckDB dédiée à Metabase (mapping `translate_table_name`) via `copy_to_clean_duckdb.py`.
- Option d’export/import de base complète pour diffusion contrôlée.

### Sécurité

- Accès PostgreSQL en lecture seule: chaîne ATTACH avec utilisateur read-only.
- Accès S3 Cellar: clés stockées en variables d’environnement, usage HTTPS, secret DuckDB persistant.
- Stockage DuckDB: fichiers locaux contrôlés par l’orchestrateur et le système hôte (permissions système, chiffrement disque recommandé).
- Journaux: Dagster trace l’exécution, erreurs, sélections d’actifs.
- Données personnelles: suppression ou pseudonymisation possible dès `staging`/`intermediate` pour garantir que les `marts` et la base Metabase n’exposent pas de données personnelles.

### Conformité

- Minimisation des données: seules les colonnes nécessaires aux analyses sont propagées en `marts` et vers Metabase.
- Ségrégation logique: schémas par couche (`stg`, `int`, `marts`) et schémas par domaine (`production`, `lovac`, `ff`).
- Traçabilité: transformations versionnées, jobs Dagster planifiés (`definitions.py`).

### Planification et opérations

- Jobs:
  - `datawarehouse_synchronize_and_build`: synchronise les assets DWH et construit dbt (quotidien).
  - `datawarehouse_build_ff_data`: ingestion annuelle LOCOMVAC/FF.
- Schedules: `@daily`, `@yearly` définis dans `definitions.py`.
- Reprises: `RetryPolicy` et sélections d’actifs par sous-ensemble (`can_subset=True`).

### Avantages / Inconvénients (stack actuelle)

- Avantages:
  - DuckDB: performances analytiques locales très bonnes, faible ops, formats colonnes modernes.
  - dbt: industrialisation SQL, tests, documentation et couches explicites.
  - Dagster: orchestration déclarative, visibilité, facilité de relecture.
  - Metabase: adoption rapide côté métier.
- Inconvénients:
  - Concurrence d’écriture limitée sur fichier; séquencement nécessaire.
  - Montée en charge distribuée moins simple qu’un entrepôt cloud massif.
  - Discipline de gestion de fichiers et sauvegardes à mettre en place.

### Points de paramétrage sensibles

- Variables d’environnement: `CELLAR_*`, `POSTGRES_PRODUCTION_*`, `DUCKDB_MEMORY_LIMIT`, `DUCKDB_THREAD_NUMBER`.
- Tables cibles exposées à Metabase: `Config.RESULT_TABLES` et `translation_mapping`.
- Exclusions/Pseudonymisation PII: à configurer explicitement dans les modèles `staging`/`intermediate`.

### Checklist d’intégration LOCOMVAC

1) Déposer les fichiers LOCOMVAC sur le bucket Cellar prévu (chemins `lake/lovac/<année>/raw.csv`).
2) Vérifier/ajuster les types « sensibles » (ex. colonnes dates de naissance) dans `ingest/queries/lovac.py`.
3) Lancer l’asset `setup_s3_connection` puis les `build_*` correspondants.
4) Exécuter le job Dagster global pour construire les `marts` dbt.
5) Propager les tables nécessaires vers la base DuckDB Metabase.
6) Vérifier l’absence de PII en `marts` et dans Metabase.

### Questions à trancher (pour finaliser la mise en prod LOCOMVAC)

- Liste des colonnes à supprimer/pseudonymiser pour LOCOMVAC (PII exactes) ?
- Fréquence de mise à jour (annuelle, semestrielle, à l’événement) ?
- Stratégie de rétention des fichiers bruts sur le stockage objet ?
- Rôles d’accès (lecture Analysts/BI, administration Data) ?
- SLA de rafraîchissement Metabase et tests qualité dbt requis ?
