# Import des données DPE

## Présentation technique du processus d'import

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Source des données](#2-source-des-données)
3. [Architecture des scripts](#3-architecture-des-scripts)
4. [Workflow d'import](#4-workflow-dimport)
5. [Stratégie de matching](#5-stratégie-de-matching)
6. [Modèle de données](#6-modèle-de-données)
7. [Tables PostgreSQL](#7-tables-postgresql)
8. [Performance et optimisation](#8-performance-et-optimisation)

---

## 1. Vue d'ensemble

### Qu'est-ce que le DPE ?

Le **DPE** (Diagnostic de Performance Énergétique) est un document obligatoire pour la vente ou la location d'un bien immobilier en France. Il évalue :

- La **consommation énergétique** (étiquette A à G)
- Les **émissions de gaz à effet de serre** (étiquette A à G)

### Objectif dans ZLV

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Enrichir les données des logements vacants avec leur DPE     │
│   pour identifier les passoires thermiques (étiquettes F/G)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chiffres clés

| Indicateur | Valeur |
|------------|--------|
| Champs DPE disponibles | **224** |
| Champs importés dans ZLV | **7** |
| Volume de données | ~10M DPE en France |
| Temps d'import complet | 2-4 heures |

---

## 2. Source des données

### ADEME - Agence de l'environnement

```
┌──────────────────────────────────────────────────────────────┐
│                        data.ademe.fr                          │
│                                                               │
│   Base de données nationale des DPE (depuis 2013)            │
│   API REST avec authentification                              │
│   Format: JSON Lines (JSONL)                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  ADEME API    │
                    │  (avec clé)   │
                    └───────────────┘
```

### Pré-requis

1. **Clé API ADEME** : Obtenir sur [data.ademe.fr](https://data.ademe.fr)
2. **Fichier JSONL** : `dpe_data_complete.jsonl` (~10 Go)

### Structure du fichier JSONL

```json
{"dpe_id": "2301E0001234567A", "id_rnb": "75102_ABC123", "etiquette_dpe": "D", ...}
{"dpe_id": "2301E0001234568B", "id_rnb": null, "etiquette_dpe": "F", ...}
```

### Limitations et défis de l'API ADEME

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ⚠️  LIMITATIONS DE L'API ADEME                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. PERFORMANCE DE TÉLÉCHARGEMENT                                       │
│  ─────────────────────────────────                                       │
│  • Téléchargement complet = plusieurs heures (~10 Go de données)        │
│  • Pas de téléchargement différentiel natif                             │
│  • Pagination lente sur grands volumes                                  │
│  • Risque de timeout sur connexions longues                             │
│                                                                          │
│  2. FRAÎCHEUR DES DONNÉES                                               │
│  ─────────────────────────                                               │
│  • Périodicité de mise à jour non documentée                            │
│  • Pas de mise à jour en temps réel (flux)                              │
│  • Délai inconnu entre dépôt d'un DPE et disponibilité API              │
│  • Absence de changelog ou versioning des données                       │
│                                                                          │
│  3. FILTRAGE TEMPOREL LIMITÉ (CÔTÉ API)                                 │
│  ───────────────────────────────────────                                 │
│  • Pas de filtre API par date de création/modification                  │
│  • L'API retourne tous les DPE, pas de paramètre "depuis date X"        │
│  • Import incrémental quotidien impossible via l'API seule              │
│  • ⚠️ Le script implémente un filtrage LOCAL par année après            │
│    téléchargement (via --target-year ou --start-year)                   │
│  • Workflow : télécharger tout → filtrer localement → traiter           │
│                                                                          │
│  4. GRANULARITÉ INSUFFISANTE POUR LES APPARTEMENTS                      │
│  ─────────────────────────────────────────────────                       │
│  • DPE rattaché au bâtiment (RNB ID), pas au logement                   │
│  • Un immeuble = 1 seul DPE pour N appartements                         │
│  • Pas de distinction entre appartements d'un même immeuble             │
│  • DPE individuel d'appartement moins représentatif que DPE immeuble    │
│  • Perte de précision pour les copropriétés hétérogènes                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Conséquences pour ZLV

| Limitation | Impact | Contournement actuel |
|------------|--------|----------------------|
| Téléchargement lent | Import complet = 2-4h | Parallélisation + reprise auto |
| Pas de flux temps réel | Données potentiellement décalées | Import périodique (mensuel ?) |
| Pas de filtre API par date | Re-téléchargement complet obligatoire | Filtrage local par année (`--start-year`) + déduplication |
| DPE au niveau bâtiment | Tous les apparts d'un immeuble ont le même DPE | Priorité au DPE immeuble collectif |

#### Illustration : Granularité bâtiment vs appartement

```
┌─────────────────────────────────────────────────────────────────────────┐
│              PROBLÈME DE GRANULARITÉ DPE / BÂTIMENT                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   RÉALITÉ TERRAIN                      DONNÉES ADEME                    │
│   ───────────────                      ─────────────                    │
│                                                                          │
│   ┌─────────────────────┐              ┌─────────────────────┐          │
│   │  Immeuble RNB-123   │              │  Immeuble RNB-123   │          │
│   ├─────────────────────┤              │                     │          │
│   │ Appt 1 │ DPE: C     │              │                     │          │
│   │ (rénové en 2020)    │              │   DPE unique: D     │          │
│   ├────────┼────────────┤     ═══▶     │   (DPE immeuble     │          │
│   │ Appt 2 │ DPE: F     │              │    collectif)       │          │
│   │ (passoire thermique)│              │                     │          │
│   ├────────┼────────────┤              │                     │          │
│   │ Appt 3 │ DPE: D     │              │                     │          │
│   │ (état d'origine)    │              │                     │          │
│   └─────────────────────┘              └─────────────────────┘          │
│                                                                          │
│   ⚠️ Conséquences :                                                      │
│   • L'appart 1 (rénové, DPE C) apparaît comme DPE D                     │
│   • L'appart 2 (passoire F) n'est pas identifié comme prioritaire       │
│   • Impossible de cibler les vrais logements énergivores                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Améliorations souhaitées (côté ADEME)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    💡 DEMANDES D'ÉVOLUTION API                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Endpoint de téléchargement différentiel                             │
│     GET /dpe?modified_since=2024-01-15                                  │
│                                                                          │
│  2. Documentation de la périodicité de mise à jour                      │
│     Ex: "Données mises à jour chaque lundi à 6h"                        │
│                                                                          │
│  3. Webhook ou flux temps réel pour les nouveaux DPE                    │
│     POST https://zlv.gouv.fr/webhooks/dpe-new                           │
│                                                                          │
│  4. Export incrémental par date d'établissement                         │
│     GET /dpe?date_etablissement_gte=2024-01-01                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture des scripts

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         server/src/scripts/import-dpe/                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│   │                 │    │                 │    │                 │    │
│   │  import-ademe   │───▶│  import_dpe_raw │───▶│   import-dpe    │    │
│   │      .py        │    │      .py        │    │      .py        │    │
│   │                 │    │                 │    │                 │    │
│   │  Télécharge     │    │  Importe 224    │    │  Met à jour     │    │
│   │  depuis ADEME   │    │  champs dans    │    │  la table       │    │
│   │                 │    │  dpe_raw        │    │  buildings      │    │
│   │                 │    │                 │    │                 │    │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘    │
│          │                       │                       │              │
│          ▼                       ▼                       ▼              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│   │  dpe_data_      │    │    dpe_raw      │    │   buildings     │    │
│   │  complete.jsonl │    │    (table)      │    │    (table)      │    │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Script 1 : import-ademe.py

**Rôle** : Télécharger les DPE depuis l'API ADEME

```bash
export ADEME_API_KEY="votre_clé"
python import-ademe.py --output-file dpe_data_complete.jsonl
```

| Fonctionnalité | Description |
|----------------|-------------|
| Reprise automatique | Continue après interruption |
| Streaming | JSON Lines pour économiser la mémoire |
| Retry automatique | Gère les erreurs réseau |

---

### Script 2 : import_dpe_raw.py

**Rôle** : Importer TOUS les 224 champs dans la table `dpe_raw`

```bash
python3 import_dpe_raw.py dpe_data_complete.jsonl --db-url "$DATABASE_URL"
```

| Fonctionnalité | Description |
|----------------|-------------|
| Import parallèle | Multi-workers (défaut: 6) |
| Par département | Possibilité d'importer un seul département |
| Gestion doublons | Upsert automatique |
| Dry-run | Mode simulation |

---

### Script 3 : import-dpe.py

**Rôle** : Enrichir la table `buildings` avec les DPE matchés

```bash
python import-dpe.py dpe_data_complete.jsonl --db-url "$DATABASE_URL"
```

| Fonctionnalité | Description |
|----------------|-------------|
| Matching intelligent | 4 stratégies de correspondance |
| Batch processing | Par lots de 1000 |
| Parallélisation | 4-8x plus rapide |
| Statistiques | Rapport détaillé en fin d'import |

---

## 4. Workflow d'import

### Diagramme de flux complet

```
                                    START
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │     1. Téléchargement ADEME     │
                    │         import-ademe.py         │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   dpe_data_complete.jsonl       │
                    │   (~10 Go, ~10M enregistrements) │
                    └─────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
    ┌───────────────────────────┐      ┌───────────────────────────┐
    │  2a. Import complet       │      │  2b. Import pour matching │
    │     import_dpe_raw.py     │      │      import-dpe.py        │
    │                           │      │                           │
    │  → Table: dpe_raw         │      │  → Table: buildings       │
    │  → 224 champs             │      │  → 7 champs               │
    │  → Archivage              │      │  → Production             │
    └───────────────────────────┘      └───────────────────────────┘
                    │                                   │
                    ▼                                   ▼
    ┌───────────────────────────┐      ┌───────────────────────────┐
    │       dpe_raw             │      │       buildings           │
    │  ┌───────────────────┐    │      │  ┌───────────────────┐    │
    │  │ dpe_id           │    │      │  │ id               │    │
    │  │ etiquette_dpe    │    │      │  │ dpe_id           │    │
    │  │ etiquette_ges    │    │      │  │ class_dpe        │    │
    │  │ id_rnb           │    │      │  │ class_ges        │    │
    │  │ code_insee_ban   │    │      │  │ dpe_date_at      │    │
    │  │ ... (219 autres) │    │      │  │ dpe_type         │    │
    │  └───────────────────┘    │      │  │ dpe_import_match │    │
    │                           │      │  └───────────────────┘    │
    └───────────────────────────┘      └───────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │   3. Exposition API/Front   │
                                    │      BuildingDTO.dpe        │
                                    └─────────────────────────────┘
                                                  │
                                                  ▼
                                                 END
```

---

## 5. Stratégie de matching

### Évolution de l'approche

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AVANT vs APRÈS : Évolution du matching                │
└─────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════╗
║  ❌  AVANT : link-dpe (TypeScript) - OBSOLÈTE                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   Source : BNDB (Base de Données Nationale du Bâtiment) via S3           ║
║   Script : server/src/scripts/link-dpe/                                  ║
║   Table mise à jour : fast_housing.energy_consumption                    ║
║                                                                           ║
║   ┌──────────┐   plot_id    ┌──────────┐  batiment_   ┌──────────┐      ║
║   │ Housing  │ ───────────▶ │  BNDB    │  groupe_id   │   BNDB   │      ║
║   │          │              │ Parcelle │ ───────────▶ │   DPE    │      ║
║   │ plot_id  │              │          │              │          │      ║
║   └──────────┘              └──────────┘              └──────────┘      ║
║                                                                           ║
║   Problèmes :                                                            ║
║   • Données BNDB pas toujours à jour                                     ║
║   • Matching indirect via parcelle = imprécis                            ║
║   • Téléchargement S3 par département = lent                             ║
║   • Ne capture pas tous les DPE disponibles                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

                                    │
                                    │  Migration
                                    ▼

╔═══════════════════════════════════════════════════════════════════════════╗
║  ✅  APRÈS : import-dpe.py (Python) - ACTUEL                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   Source : API ADEME directe (data.ademe.fr)                             ║
║   Script : server/src/scripts/import-dpe/import-dpe.py                   ║
║   Table mise à jour : buildings (7 champs DPE)                           ║
║                                                                           ║
║   Cas 1 (prioritaire) : Match direct via RNB ID                          ║
║   ┌──────────┐         id_rnb          ┌──────────┐                      ║
║   │   DPE    │ ─────────────────────▶  │ Building │                      ║
║   │  ADEME   │    (correspondance      │  (ZLV)   │                      ║
║   │ id_rnb   │     directe)            │  rnb_id  │                      ║
║   └──────────┘                         └──────────┘                      ║
║                                                                           ║
║   Cas 2 (fallback) : Match via adresse BAN                               ║
║   ┌──────────┐   identifiant_ban   ┌──────────┐                          ║
║   │   DPE    │ ──────────────────▶ │ Building │                          ║
║   │  ADEME   │   (correspondance   │  (ZLV)   │                          ║
║   │ ban_id   │    via adresse)     │ ban_id   │                          ║
║   └──────────┘                     └──────────┘                          ║
║                                                                           ║
║   Avantages :                                                            ║
║   • Données ADEME = source officielle, toujours à jour                   ║
║   • Matching RNB direct = plus précis                                    ║
║   • Import parallèle = rapide (2-4h pour toute la France)                ║
║   • 224 champs disponibles dans dpe_raw pour analyses                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Approche actuelle en détail

Le script `import-dpe.py` utilise **2 stratégies de matching** par ordre de priorité :

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STRATÉGIE DE MATCHING ACTUELLE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Cas 1 : Match direct via RNB ID (prioritaire)                         │
│   ═════════════════════════════════════════════                          │
│                                                                          │
│   ┌──────────┐         id_rnb          ┌──────────┐                     │
│   │   DPE    │ ─────────────────────▶  │ Building │                     │
│   │  ADEME   │    (correspondance      │  (ZLV)   │                     │
│   │ id_rnb   │     directe)            │  rnb_id  │                     │
│   └──────────┘                         └──────────┘                     │
│                                                                          │
│   • 1.1 DPE immeuble collectif ou maison individuelle                   │
│   • 1.2 DPE appartement individuel                                      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Cas 2 : Match via adresse BAN (fallback)                              │
│   ════════════════════════════════════════                               │
│                                                                          │
│   ┌──────────┐   identifiant_ban   ┌──────────┐                         │
│   │   DPE    │ ──────────────────▶ │ Building │                         │
│   │  ADEME   │   (via table        │  (ZLV)   │                         │
│   │ ban_id   │    ban_addresses)   │          │                         │
│   └──────────┘                     └──────────┘                         │
│                                                                          │
│   • 2.1 DPE immeuble collectif ou maison individuelle                   │
│   • 2.2 DPE appartement individuel                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Priorité des DPE (en cas de multiples)

```
┌─────────────────────────────────────────────────────────────┐
│                   RÈGLE DE PRIORITÉ                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. DPE immeuble collectif    ▶▶▶  Plus fiable             │
│   2. DPE maison individuelle   ▶▶   Fiable                  │
│   3. DPE appartement           ▶    Moins représentatif     │
│                                                              │
│   En cas d'égalité → Le plus récent (date_etablissement)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Exemples concrets

#### Exemple 1 : Match via RNB ID (cas prioritaire)

```
DPE reçu:
{
  "dpe_id": "2301E0001234567A",
  "id_rnb": "75102_ABC123",           ◀── RNB ID présent
  "identifiant_ban": null,
  "etiquette_dpe": "D",
  "type_batiment": "immeuble collectif",
  "date_etablissement_dpe": "2024-01-15"
}

                    │
                    ▼
            ┌───────────────┐
            │  Cas 1.1      │
            │  Match RNB    │
            │  direct       │
            └───────────────┘
                    │
                    ▼
UPDATE buildings
SET dpe_id = '2301E0001234567A',
    class_dpe = 'D',
    dpe_type = 'dpe immeuble collectif',
    dpe_date_at = '2024-01-15',
    dpe_import_match = 'rnb_id'
WHERE rnb_id = '75102_ABC123';
```

#### Exemple 2 : Match via BAN ID (fallback)

```
DPE reçu:
{
  "dpe_id": "2301E0001234568B",
  "id_rnb": null,                     ◀── Pas de RNB ID
  "identifiant_ban": "75102_1234_00012",  ◀── BAN ID présent
  "etiquette_dpe": "F",
  "type_batiment": "appartement",
  "date_etablissement_dpe": "2023-06-20"
}

                    │
                    ▼
            ┌───────────────┐
            │  Cas 2.2      │
            │  Match BAN    │
            │  (fallback)   │
            └───────────────┘
                    │
                    ▼
UPDATE buildings b
SET dpe_id = '2301E0001234568B',
    class_dpe = 'F',
    dpe_type = 'dpe appartement individuel',
    dpe_date_at = '2023-06-20',
    dpe_import_match = 'ban_id'
FROM ban_addresses ba
WHERE ba.ban_id = '75102_1234_00012'
  AND ba.ref_id = b.id;
```

---

## 6. Modèle de données

### BuildingDTO (API/Frontend)

```typescript
interface BuildingDTO {
  id: string;
  housingCount: number;
  vacantHousingCount: number;
  rentHousingCount: number;

  // RNB (Référentiel National des Bâtiments)
  rnb: {
    id: string | null;
    score: number;
  } | null;

  // DPE (Diagnostic de Performance Énergétique)
  dpe: {
    id: string;                    // Ex: "2301E0001234567A"
    class: EnergyConsumption;      // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
    doneAt: string;                // ISO 8601: "2024-01-15"
    type: EnergyConsumptionType;   // Type de DPE
    match: EnergyConsumptionMatch; // Méthode de matching
  } | null;
}
```

### Types énumérés

```typescript
// Classe énergétique (A = meilleur, G = passoire thermique)
type EnergyConsumption = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

// Type de DPE
type EnergyConsumptionType =
  | 'dpe appartement individuel'
  | 'dpe immeuble collectif'
  | 'dpe maison individuelle';

// Méthode de matching utilisée
type EnergyConsumptionMatch =
  | 'rnb_id'   // Match direct via RNB (prioritaire)
  | 'ban_id';  // Match via adresse BAN (fallback) ← Nouvelle approche

// ⚠️ Note: packages/models/src/EnergyConsumption.ts contient encore 'plot_id'
// au lieu de 'ban_id'. À mettre à jour pour refléter la nouvelle approche.
```

---

## 7. Tables PostgreSQL

### Table `buildings` (production)

```sql
┌─────────────────────────────────────────────────────────────────────┐
│                           buildings                                  │
├─────────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                                │
│ rnb_id              VARCHAR          ◀── Clé de matching           │
│ plot_id             VARCHAR          ◀── Parcelle cadastrale       │
│ housing_count       INTEGER                                         │
│ ...                                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ -- Champs DPE (ajoutés par migration)                               │
│ dpe_id              VARCHAR          ◀── Identifiant ADEME         │
│ class_dpe           CHAR(1)          ◀── A, B, C, D, E, F, G       │
│ class_ges           CHAR(1)          ◀── Émissions GES             │
│ dpe_date_at         DATE             ◀── Date du diagnostic        │
│ dpe_type            VARCHAR          ◀── Type de DPE               │
│ heating_building    VARCHAR          ◀── Type chauffage            │
│ dpe_import_match    VARCHAR          ◀── rnb_id ou ban_id          │
└─────────────────────────────────────────────────────────────────────┘

INDEX idx_buildings_rnb_id ON buildings(rnb_id) WHERE rnb_id IS NOT NULL;
INDEX idx_buildings_dpe_id ON buildings(dpe_id) WHERE dpe_id IS NOT NULL;
```

### Table `dpe_raw` (archivage complet)

```sql
┌─────────────────────────────────────────────────────────────────────┐
│                            dpe_raw                                   │
├─────────────────────────────────────────────────────────────────────┤
│ dpe_id                              VARCHAR PRIMARY KEY             │
│                                                                      │
│ -- Identifiants (~10 champs)                                        │
│ numero_dpe, id_rnb, ...                                             │
│                                                                      │
│ -- Localisation (~20 champs)                                        │
│ code_insee_ban, code_postal_ban, adresse_brut, ...                  │
│                                                                      │
│ -- Performance énergétique (~80 champs)                             │
│ etiquette_dpe, etiquette_ges, conso_chauffage, conso_ecs, ...       │
│                                                                      │
│ -- Caractéristiques bâtiment (~30 champs)                           │
│ type_batiment, annee_construction, surface_habitable, ...           │
│                                                                      │
│ -- Installations techniques (~50 champs)                            │
│ type_chauffage, type_ecs, type_ventilation, ...                     │
│                                                                      │
│ -- Isolation et déperditions (~20 champs)                           │
│ qualite_isolation_murs, qualite_isolation_plancher, ...             │
│                                                                      │
│ -- Dates (~10 champs)                                               │
│ date_etablissement_dpe, date_reception, date_visite, ...            │
│                                                                      │
│ -- TOTAL: 224 champs                                                │
└─────────────────────────────────────────────────────────────────────┘

-- 8 index pour les requêtes fréquentes
INDEX idx_dpe_raw_code_insee ON dpe_raw(code_insee_ban);
INDEX idx_dpe_raw_etiquette_dpe ON dpe_raw(etiquette_dpe);
INDEX idx_dpe_raw_date_etablissement ON dpe_raw(date_etablissement_dpe);
...
```

### Table `fast_housing` (optimisée pour requêtes)

```sql
┌─────────────────────────────────────────────────────────────────────┐
│                          fast_housing                                │
├─────────────────────────────────────────────────────────────────────┤
│ id                  UUID                                            │
│ building_id         UUID             ◀── Lien vers buildings       │
│ actual_dpe          CHAR(1)          ◀── Classe DPE héritée        │
│ ...                                                                  │
└─────────────────────────────────────────────────────────────────────┘

INDEX idx_fast_housing_id ON fast_housing(id);
INDEX idx_fast_housing_building_id ON fast_housing(building_id);
```

---

## 8. Performance et optimisation

### Index critiques

```sql
-- Amélioration: ~17,000x sur les requêtes de matching

-- Pour le matching RNB
CREATE INDEX idx_buildings_rnb_id
ON buildings(rnb_id)
WHERE rnb_id IS NOT NULL;

-- Pour éviter les doublons
CREATE INDEX idx_buildings_dpe_id
ON buildings(dpe_id)
WHERE dpe_id IS NOT NULL;

-- Pour le matching via adresse BAN
CREATE INDEX idx_ban_addresses_ban_id_housing
ON ban_addresses(ban_id, ref_id)
WHERE address_kind = 'Housing' AND ban_id IS NOT NULL;
```

### Configuration recommandée

```
┌────────────────────────────────────────────────────────────┐
│              CONFIGURATION OPTIMALE                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   Workers parallèles     : 6 (défaut)                      │
│   Taille des batchs      : 1000-2000                       │
│   Timeout connexion      : 30s                             │
│   Retry attempts         : 3                               │
│                                                             │
│   Temps estimé (France)  : 2-4 heures                      │
│   Mémoire requise        : ~4 Go                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Commandes de diagnostic

```bash
# Vérifier le nombre de DPE importés
psql "$DATABASE_URL" -c "
SELECT
  COUNT(*) as total,
  COUNT(dpe_id) as with_dpe,
  ROUND(100.0 * COUNT(dpe_id) / COUNT(*), 2) as percent
FROM buildings;"

# Distribution par classe énergétique
psql "$DATABASE_URL" -c "
SELECT class_dpe, COUNT(*)
FROM buildings
WHERE class_dpe IS NOT NULL
GROUP BY class_dpe
ORDER BY class_dpe;"

# Méthode de matching utilisée
psql "$DATABASE_URL" -c "
SELECT dpe_import_match, COUNT(*)
FROM buildings
WHERE dpe_id IS NOT NULL
GROUP BY dpe_import_match;"
```

---

## Annexes

### Migrations Knex associées

| Migration | Description |
|-----------|-------------|
| `20250618141907_add_dpe_fields_to_buildings.ts` | Ajoute les champs DPE à `buildings` |
| `20251215164103_dpe-import-optimization-indexes.ts` | Crée les index de performance |
| `20260122165040_fast-housing-add-actual-dpe.ts` | Ajoute `actual_dpe` à `fast_housing` |

### Fichiers de configuration

```
server/src/scripts/import-dpe/          ◀── APPROCHE ACTUELLE (Python)
├── import-ademe.py           # Téléchargement ADEME
├── import_dpe_raw.py         # Import table dpe_raw
├── import-dpe.py             # Import table buildings
├── generate_schema.py        # Génération schéma SQL
├── dpe_raw_fields.py         # Définition des 224 champs
├── requirements.txt          # Dépendances Python
└── README.md                 # Documentation complète

server/src/scripts/link-dpe/            ◀── ANCIENNE APPROCHE (TypeScript) - OBSOLÈTE
├── index.ts                  # Point d'entrée
├── downloader.ts             # Téléchargement BNDB depuis S3
├── loader.ts                 # Chargement et matching via parcelle
└── README.md                 # Documentation
```

### Liens utiles

- [API ADEME](https://data.ademe.fr) - Source des données DPE
- [Référentiel National des Bâtiments (RNB)](https://rnb.beta.gouv.fr/) - Identifiants bâtiments
- [Base Adresse Nationale (BAN)](https://adresse.data.gouv.fr/) - Géocodage des adresses

---

*Document généré automatiquement - Zéro Logement Vacant*
