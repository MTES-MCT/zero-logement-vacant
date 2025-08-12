### Entrepôt de données ZLV — Présentation générale (non technique)

Cette notice présente l’entrepôt de données (Data Warehouse, DWH) de Zéro Logement Vacant, ses usages, son fonctionnement et ses garanties de sécurité. Elle est destinée aux profils non techniques (métier, support, « go-to-market ») et aux nouveaux arrivants.

### Pourquoi un DWH ?

- **Centraliser**: regrouper des données dispersées (production applicative, fichiers externes comme LOCOMVAC/FF, référentiels) dans un espace cohérent et durable.
- **Fiabiliser**: appliquer des règles de qualité, de déduplication et de mise en conformité pour obtenir des indicateurs stables et comparables dans le temps.
- **Accélérer l’analyse**: fournir des tables prêtes à l’usage pour la data visualisation (ex. Metabase) et le pilotage.
- **Tracer l’historique**: conserver l’évolution des données et des transformations (traçabilité des calculs et de la fraîcheur).

### Cas d’usages adressés et fonctionnalités

- **Pilotage des campagnes et du parc**: suivi des logements, propriétaires, événements, groupes, établissements, campagnes, etc.
- **Tableaux de bord prêts à l’emploi**: les tables « marts » sont optimisées pour Metabase (indicateurs, agrégats, hiérarchies admin, géocodage).
- **Intégration de sources externes**: fichiers LOCOMVAC/FF et référentiels administratifs.
- **Qualité et conformité**: contrôle des schémas, exclusions de colonnes sensibles, pseudonymisation lorsque nécessaire.

### Comment ça marche (schéma de principe)

```mermaid
flowchart LR
    A[(PostgreSQL production - lecture seule)] -->|Ingestion| B[(DuckDB - zone Raw/Staging)]
    A1[(Fichiers LOCOMVAC / FF sur stockage objet S3 compatible)] -->|Ingestion| B
    B -->|Transformations avec dbt (staging -> intermediate -> marts)| C[(DuckDB - tables marts)]
    C -->|Mise à disposition| D[Metabase]
```

- **Ingestion**: synchronisation des tables de production en lecture seule, et chargement des fichiers externes (LOCOMVAC/FF) depuis un stockage objet compatible S3.
- **Transformation**: trois couches de modèles dbt (`staging`, `intermediate`, `marts`) structurent et fiabilisent les données.
- **Exposition**: les tables finales (« marts ») sont exposées à Metabase pour créer des tableaux de bord.

### Stack utilisée

- **Dagster**: orchestration des tâches (synchronisation, chargements, vérifications, planification).
- **dbt**: modélisation des données (tests, documentation, transformation SQL en couches).
- **DuckDB**: moteur analytique en fichier, rapide et simple à opérer.
- **Metabase**: outil de BI pour l’exploration et la visualisation.

### Sécurité et conformité

- **Stockage**:
  - Les données analytiques résident dans des fichiers DuckDB gérés par l’orchestrateur et uniquement accessibles par des comptes et machines autorisés.
  - Les sources externes (LOCOMVAC/FF) sont stockées sur un stockage objet compatible S3 (« Cellar ») avec clés d’accès dédiées.
  - Recommandation: chiffrage des disques hôtes et restriction d’accès au répertoire des bases DuckDB.
- **Flux**:
  - Ingestion depuis PostgreSQL en lecture seule (pas d’écriture côté production depuis l’analytics).
  - Accès au stockage objet via HTTPS avec clés d’accès limitées (variables d’environnement).
  - Traçabilité Dagster (logs, planification, dépendances).
- **Conformité réglementaire (RGPD)**:
  - Par défaut, les tables d’analyse excluent ou pseudonymisent les données personnelles non nécessaires.
  - Les colonnes sensibles peuvent être supprimées ou hachées dans les couches `staging`/`intermediate` et ne pas apparaître en `marts`.
  - Des vues « publiques » ne contiennent pas de données personnelles.

### Avantages et inconvénients de la stack

- **Avantages**:
  - Simplicité d’exploitation: DuckDB ne requiert pas d’infrastructure serveur lourde.
  - Performances analytiques excellentes sur un volume typique de données métiers.
  - dbt apporte une gouvernance claire (tests, documentation, couches).
  - Dagster offre visibilité, planification et reprise sur incident.
  - Metabase facilite l’exploration self-service.
- **Inconvénients**:
  - Concurrence en écriture limitée avec un fichier DuckDB unique (séquencement via Dagster requis).
  - Scalabilité horizontale plus contrainte qu’une base distribuée classique.
  - Besoin d’une hygiène stricte sur la gestion des fichiers et des sauvegardes.

### Autres cas d’usages adressables

- Intégrer d’autres fichiers nationaux (référentiels, cadastre, géo) pour enrichir les analyses.
- Construire des indicateurs d’impact, de délais, d’activation, par territoire.
- Mettre à disposition des exports agrégés vers des partenaires.

### Données personnelles et environnement analytics

Pour garantir la conformité, les données personnelles peuvent être retirées ou pseudonymisées avant exposition dans l’environnement analytics. Les tables finales consommées par Metabase ne contiennent que les informations nécessaires à l’analyse.

### Questions en suspens (à valider pour finaliser la notice)

- Jeux de données prioritaires pour Metabase (liste d’indicateurs « must have ») ?
- Règles exactes d’anonymisation/pseudonymisation attendues pour LOCOMVAC/FF ?
- Périmètre des accès (qui peut lire quoi, par équipe/territoire) ?
- Fréquences de rafraîchissement attendues par source ?
- Politique de rétention/suppression des sources brutes ?
