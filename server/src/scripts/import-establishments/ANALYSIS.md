# Analyse du schéma `establishments` et mise à jour avec les nouvelles données

## 🎯 Résumé Exécutif

**Objectifs** :
- ✅ Actualiser les périmètres des établissements
- ✅ Supprimer la legacy dans l'écriture des noms (MAJUSCULES)
- ✅ Séparer échelon administratif (`kind`) et nature juridique (`kind_meta`)
- ✅ Ajouter le SIRET (clé de jointure Portail DF)

**Données analysées** :
- **36 810 lignes** dans les CSV (403 entités + 36 408 collectivités)
- **36 737 SIREN uniques** avec relation 1:1 vers SIRET
- **193 établissements orphelins** détectés en base (absents des CSV)

**Résultats clés** :
- ✅ **23 établissements avec utilisateurs actifs** → Traitement manuel requis ([voir rapport](ORPHAN_ESTABLISHMENTS_REPORT.md))
- ✅ **170 établissements sans impact** → Suppression définitive (DELETE)
- ✅ Relation 1:1 SIREN-SIRET confirmée (100% des cas)

**Fichiers générés** :
- [ORPHAN_ESTABLISHMENTS_REPORT.md](ORPHAN_ESTABLISHMENTS_REPORT.md) - Analyse détaillée des orphelins
- [orphan_establishments_report.csv](orphan_establishments_report.csv) - Liste avec actions recommandées

---

## 📊 Schéma actuel de la table `establishments`

### Colonnes principales (hors date de mise à jour, soft delete, désactivation...)

- `id` (UUID) - Identifiant unique
- `name` (string) - Nom de l'établissement
- `siren` (integer) - SIREN de l'établissement
- `localities_geo_code` (text[]) - Array des codes géographiques INSEE, créé en [035-establishments-localities.ts:6](../../infra/database/migrations/035-establishments-localities.ts#L6) a.k.a périmètres géograhiques
- `kind` (string) - Type d'établissement (REG, DEP, CC, CA, CU, ME, Commune, etc.), ajouté en [055-establishment-kinds.ts:6](../../infra/database/migrations/055-establishment-kinds.ts#L6)
- `source` (string) - Source de données ('seed', 'import', etc.), ajouté en [20240531083601_establishment-source.ts:6](../../infra/database/migrations/20240531083601_establishment-source.ts#L6)
- `available` (boolean) - true si au moins un utilisateur existe

### ❌ Colonnes manquantes (à ajouter via migration)

- `siret` (string(14) ou bigint) - **Absent dans le schéma actuel**
  - **Besoin** : Clé de jointure avec Portail DF
  - **Priorité** : Critique
  - **Contrainte** : Unique, avec index pour performance
  - ✅ **Relation 1:1 avec SIREN** : Chaque SIREN a exactement 1 SIRET dans les données (36 737 cas vérifiés)
  - **Implication** : SIRET peut servir de clé unique alternative au SIREN

- `kind_meta` (string, nullable)
  - **Besoin** : Distinguer nature juridique (Collectivité Territoriale, Services de l'Etat) de l'échelon administratif (`kind`)
  - **Priorité** : Haute
  - **Valeurs** : "Collectivité Territoriale", "Services de l'Etat", "Autre", etc.

- `short_name` (string, nullable) ❓
  - **Actuellement** : Calculé dynamiquement dans [establishmentRepository.ts:229-232](../../repositories/establishmentRepository.ts#L229-232)
  - **Si ajouté** : Dénormalisation pour améliorer les performances d'affichage
  - **Priorité** : Basse

- `millesime` (integer, nullable) ❓
  - **Besoin** : Tracker la version des données (année de référence)
  - **Priorité** : Basse

## 📁 Structure des nouveaux fichiers CSV

### Colonnes disponibles dans les CSV

1. `Name-zlv` - Nom court pour ZLV
2. `Name-source` - Nom complet source (avec majuscules legacy)
3. `Kind-admin_meta` - Méta-catégorie (ex: "Collectivité Territoriale", "Services de l'Etat")
4. `Kind-admin` - Code admin (REG, DEP, CC, CA, etc.)
5. `Kind-admin_label` - Label du type (ex: "Région", "Département")
6. **`Siren`** - ✅ Présent
7. **`Siret`** - ✅ **Nouvelle donnée clé pour jointure Portail DF**
8. `Layer-geo_label` - Niveau géographique
9. `Geo_Perimeter` - Array de codes INSEE (équivalent à `localities_geo_code`)
10. `Dep_Code`, `Dep_Name`, `Reg_Code`, `Reg_Name` - Métadonnées géographiques
11. `Millesime` - Année des données (2025)

### Volumes

- `entities_processed.csv` : 403 lignes (administrations d'État, ADIL, etc.)
- `collectivities_processed.csv` : 36 409 lignes (collectivités territoriales)

### Exemple d'enregistrement

```csv
Name-zlv,Name-source,Kind-admin_meta,Kind-admin,Kind-admin_label,Siren,Siret,Layer-geo_label,Geo_Perimeter,Dep_Code,Dep_Name,Reg_Code,Reg_Name,Millesime
Région Martinique,Martinique,Collectivité Territoriale,REG,Région,200055507,20005550700012,Région,"['97201', '97202', ...]",['972'],['Martinique'],02,Martinique,2025
```

## 🔬 Analyse de qualité des données CSV

### Script de vérification

Un script Python [check_uniqueness.py](./check_uniqueness.py) a été créé pour vérifier l'unicité des SIREN/SIRET.

**Lancer le script** :
```bash
python3 server/src/scripts/import-establishments/check_uniqueness.py
```

### Résultats de l'analyse (36 810 lignes)

#### ✅ Points positifs
- Tous les SIRET sont au format 14 chiffres
- Tous les SIREN sont au format 9 chiffres (sauf les vides)
- Les SIRET commencent bien par leur SIREN correspondant
- ✅ **Relation 1:1 stricte** : Chaque SIREN a exactement 1 SIRET unique (0 cas de SIREN avec multiples SIRET différents sur 36 737 SIREN vérifiés)

#### ⚠️ Problèmes identifiés

##### 1. SIREN vides (63 cas)

**Catégories concernées** :

1. **Collectivités à statut particulier (7 cas)** : Mayotte, Corse-du-Sud, Haute-Corse, Bas-Rhin, Haut-Rhin, Martinique, Guyane
   - **Raison** : Collectivités territoriales uniques (statut spécial depuis réformes territoriales)
   - **Exemple CSV** : `Région Mayotte,,,Région,"['97601', ...]"` → SIREN et SIRET vides
   - **Problème** : Ces collectivités existent juridiquement mais n'ont pas (encore) de SIREN dans les données sources
   - **Note** : Certaines ont leur équivalent avec SIREN dans le fichier `entities` (ex: Département de Mayotte avec SIREN `229850003`)

2. **Territoires d'outre-mer non intégrés (28 cas)** : Terres australes, Clipperton, Saint-Barthélemy, communes de Nouvelle-Calédonie (Bélep, Dumbéa, Nouméa, etc.)
   - **Raison** : Territoires à statut particulier hors du système administratif métropolitain standard
   - **Exemple CSV** : `Collectivité Terres australes et antarctiques françaises,,,TOM,"[]"` → SIREN/SIRET vides
   - **Problème** : Pas d'attribution SIREN/SIRET dans le système INSEE classique

3. **Arrondissements municipaux (28 cas)** : Paris (1-16), Lyon (1-9), Marseille (1-16)
   - **Raison** : Les arrondissements **ne sont pas des entités juridiques autonomes** avec personnalité morale
   - **Exemple CSV** : `Marseille 1er Arrondissement,,,ARR,"['13201']"` → SIREN/SIRET vides
   - **Explications** :
     - Seules les **communes** ont un SIREN (ex: Marseille = `211300553`)
     - Les arrondissements sont des **subdivisions administratives internes** à la commune
     - Ils n'ont **pas de budget propre** ni de personnalité juridique distincte
     - Ils ne peuvent donc **pas recevoir de SIREN/SIRET**

**Impact sur l'import** :
- ❌ **Ces 63 entités ne peuvent PAS être importées** si `siren` est une contrainte `NOT NULL` ou une clé primaire/unique
- ⚠️ **Perte de périmètres géographiques** : Les codes INSEE des arrondissements (ex: `13201` pour Marseille 1er) ne seront pas associés à un établissement

##### 2. Doublons SIREN/SIRET (10 cas)

**Cas légitimes - Collectivités à statut spécial** (6 cas) :
Présentes à la fois dans `entities` (ACT) et `collectivities` (REG/DEP/TOM) :
- Corse : `200076958` / `20007695800012`
- Mayotte : `229850003` / `22985000300018`
- Guyane : `200052678` / `20005267800014`
- Martinique : `200055507` / `20005550700012`
- Nouvelle-Calédonie : `229880018` / `22988001800010`
- Saint-Barthélemy : `200015816` / `20001581600016`

**Recommandation** : Garder uniquement la version `collectivities` (plus précise avec type REG/DEP/TOM)

**Cas problématiques - Erreurs dans les données** (4 cas) :

1. **Landes vs Paris** : Même SIREN `224000018` / SIRET `22400001800016`
   - ❌ **Erreur critique** : Deux départements différents ne peuvent pas avoir le même SIREN
   - Impact : Impossible d'importer les deux

2. **Communes homonymes** (3 cas) :
   - Saint-Pierre-Aigle (02) vs Saint-Pierre (975) : `210206629` / `21020662900011`
   - Ayat-sur-Sioule (63) vs Yaté (988) : `216300251` / `21630025100016`
   - Saint Martin de l'If (76) vs Saint-Martin (978) : `200057339` / `20005733900018`
   - ❌ **Erreur** : Communes différentes ne peuvent pas avoir le même SIREN/SIRET

**Recommandation** :
- Contacter la source des données pour corriger les SIREN/SIRET erronés
- En attendant : importer uniquement la première occurrence de chaque doublon
- Logger les doublons pour suivi

#### 📊 Statistiques finales
```
Total rows processed: 36,810
Empty SIREN: 63 (0.17%)
Duplicate SIREN: 10 (0.03%)
Duplicate SIRET: 10 (0.03%)
Valid unique records: 36,737 (99.8%)

Relation SIREN ↔ SIRET:
✅ Relation 1:1 stricte: 36,737 SIREN → 36,737 SIRET uniques (0 SIREN avec multiples SIRET)
```

## 🔍 Problèmes identifiés et objectifs

### 1. **Ajout du SIRET**

- **Besoin** : Clé de jointure avec Portail DF
- **Impact** : Colonne à ajouter en base
- **Migration** : Ajouter `siret` (string(14) ou bigint)
- **Contrainte d'unicité** : Voir section "Doublons SIREN/SIRET" ci-dessus

### 2. **Normalisation des noms**

- **Problème actuel** : Coexistence minuscules/MAJUSCULES (ex: "DIRECTION GENERALE..." vs "Région Martinique")
- **CSV** : Fournit `Name-zlv` (normalisé) et `Name-source` (legacy)
- **Impact** : Mettre à jour la colonne `name` avec le contenu `Name-zlv`

### 3. **Séparation type d'échelon vs nature** 

- **Problème** : Confusion entre `kind` (échelon administratif) et `Kind-admin_meta` (nature de l'entité)
- **CSV** : Propose 3 champs distincts :
  - `Kind-admin` → `kind` (REG, DEP, CC, CA, etc.)
  - `Kind-admin_label` → Label lisible
  - `Kind-admin_meta` → Nature ("Collectivité Territoriale", "Services de l'Etat", etc.)
- Ajouter une colonne `kind_meta` en base de données
- **Impact** :
  - Migration pour ajouter `kind_meta` (string, nullable)
  - Mise à jour du type `EstablishmentDBO` et `EstablishmentDTO`
  - Filtre supplémentaire dans `establishmentRepository.filter()`
  - Permet de distinguer clairement échelon administratif vs nature juridique

### 4. **Actualisation des périmètres**

- **CSV** : `Geo_Perimeter` contient les codes INSEE à jour
- **Base actuelle** : `localities_geo_code` (text[])
- **Impact** : Mise à jour en masse des périmètres

## ⚠️ Effets de bord et contraintes identifiés

### Contraintes de schéma

#### 1. Table `establishments_localities`

Fichier: [078-establishments-localities.ts](../../infra/database/migrations/078-establishments-localities.ts)

- Table de jointure N-N entre `establishments` et `localities`
- **Impact** : Si on modifie `localities_geo_code`, cette table doit être resynchronisée ou supprimée
- **Risque** : Perte de cohérence si migration mal faite

#### 2. Type du SIREN et SIRET

- **Base actuelle** : `siren` est `integer` ([EstablishmentDBO:198](../../repositories/establishmentRepository.ts#L198))
- **CSV** : SIREN et SIRET en string (ex: "120067012" / "12006701200027")
- **Risque** : Overflow si SIREN > 2^31 (peu probable) mais SIRET > 2^31 garanti (14 chiffres)
- **Recommandation** :
  - `siren` : `bigint` (pour cohérence avec SIRET)
  - `siret` : `bigint` ou `string(14)`
- ✅ **Relation 1:1 vérifiée** : Contrainte `UNIQUE` possible sur les deux colonnes

#### 3. Colonne `short_name`

- **Actuellement** : Calculé dynamiquement ([line 229-232](../../repositories/establishmentRepository.ts#L229-232))
- **Si ajouté en base** : Dénormalisation, mais améliore les perfs
- **Impact** : Modifier `EstablishmentDBO` et `parseEstablishmentApi`

### Contraintes fonctionnelles

#### 4. Filtres existants et nouveaux

Fichier: [establishmentRepository.ts:147-193](../../repositories/establishmentRepository.ts#L147-193)

**Filtres actuels** :
- Filtre par `siren` : ✅ Compatible
- Filtre par `geoCodes` : ✅ Compatible (`localities_geo_code`)
- Filtre par `kind` : ⚠️ Vérifier que les valeurs CSV matchent les valeurs actuelles

**Nouveaux filtres à implémenter** :
- ✅ **Filtre par `siret`** : À ajouter dans `EstablishmentFiltersDTO` et `filter()`
  ```typescript
  if (filters?.siret) {
    builder.whereIn('siret', filters.siret);
  }
  ```
- ✅ **Filtre par `kind_meta`** : À ajouter pour filtrer par nature juridique
  ```typescript
  if (filters?.kind_meta) {
    builder.whereIn('kind_meta', filters.kind_meta);
  }
  ```

**Impact sur le frontend** :
- Mise à jour des interfaces de filtres
- Ajout de composants de filtre UI pour SIRET et kind_meta
- Mise à jour des exports de données (CSV/Excel)

#### 5. Modèle `EstablishmentKind`

Fichier: [EstablishmentKind.ts](../../../../packages/models/src/EstablishmentKind.ts#L3-18)

```typescript
'ASSO', 'CA', 'CC', 'Commune', 'CTU', 'CU', 'DEP', 'ME',
'PETR', 'REG', 'SDED', 'SDER',
"Service déconcentré de l'État à compétence (inter) départementale",
'SIVOM'
```

- **CSV** : Utilise `Kind-admin` (REG, DEP, CC, CA, ADMIN, etc.)
- **Risque** : Nouveaux types dans CSV non gérés par le modèle TypeScript
- **Impact** : Vérifier exhaustivité et ajouter nouveaux types si nécessaire

#### 6. Fonction `isDepartmentalEstablishment`

Fichier: [EstablishmentDTO.ts:26-39](../../../../packages/models/src/EstablishmentDTO.ts#L26-39)

- Liste hardcodée : `['DEP', 'SDED', 'SDER', 'SIVOM', 'REG', 'CTU']`
- **Impact avec `kind_meta`** : Cette fonction pourrait être simplifiée en utilisant `kind_meta === 'Services de l\'Etat'` ou rester basée sur `kind` pour plus de granularité

#### 7. Utilisation du `shortName`

- **Frontend** : Probablement utilisé dans l'affichage
- **Impact** : Si stocké en base au lieu d'être calculé, vérifier tous les usages

### Contraintes de données

#### 8. Relations avec le Portail DF

- **Scripts** : [establishment-verifier.py](../perimeters-portaildf/02-establishment-verifier/establishment-verifier.py) utilise déjà le SIRET
- **Impact** : Ces scripts attendent le SIRET en base, actuellement absent
- **Risque** : Scripts cassés sans migration

#### 9. Table `users` et gestion des établissements orphelins

- Liée à `establishments` via `establishment_id`
- **Impact** : Si on supprime/fusionne des establishments, cascade sur users
- **Recommandation** : Stratégie de migration (UPDATE plutôt que DELETE/INSERT)

**⚠️ Problème des établissements orphelins** :
- **Définition** : Établissements présents en base ZLV mais **absents des fichiers CSV d'import**
- **Causes possibles** :
  - Établissements créés manuellement dans ZLV
  - Collectivités fusionnées/supprimées depuis le dernier import
  - Réorganisations administratives (ex: DREAL → DREETS)
  - Erreurs dans les données sources
- **Risque** : Perte d'accès utilisateurs si établissement supprimé par erreur

**📊 Résultats de l'analyse sur copieprod** (voir [ORPHAN_ESTABLISHMENTS_REPORT.md](ORPHAN_ESTABLISHMENTS_REPORT.md)) :
- **193 établissements orphelins** détectés
- **23 avec utilisateurs actifs** (dont 20 DREAL/DEAL, 1 CE d'Alsace avec 4 users + 8 campagnes)
- **0 avec campagnes uniquement**
- **170 sans utilisateurs ni campagnes** (125 communes, 20 DREETS, 3 départements, 2 CC, 1 EPCI)

**Procédure de détection post-import** :
```sql
-- Identifier les établissements orphelins
SELECT e.*,
       (SELECT COUNT(*) FROM users WHERE establishment_id = e.id AND deleted_at IS NULL) as user_count,
       (SELECT COUNT(*) FROM campaigns WHERE establishment_id = e.id) as campaign_count
FROM establishments e
WHERE e.siren NOT IN (SELECT DISTINCT siren FROM csv_import_temp)
  AND e.deleted_at IS NULL;
```

**Décision par cas** :
1. **Avec utilisateurs actifs** → ⚠️ **Traitement manuel obligatoire**
   - Investiguer pourquoi l'établissement est absent du CSV
   - Identifier la nouvelle structure (ex: DREAL → DREETS)
   - Migrer les utilisateurs vers le bon établissement : `UPDATE users SET establishment_id = 'nouveau_id' WHERE establishment_id = 'ancien_id'`
   - Logger dans un fichier de rapport
   - **Action** : 23 cas à traiter (voir rapport détaillé)

2. **Sans utilisateur, avec campagnes** → Évaluer impact métier
   - Vérifier si campagnes actives ou historiques
   - Archiver ou migrer vers établissement parent
   - **Action** : 0 cas détectés

3. **Sans utilisateur, sans campagne** → **Suppression définitive**
   - **Action** : Suppression définitive (DELETE) de 170 établissements
   ```sql
   -- 1. Supprimer les relations dans establishments_localities
   DELETE FROM establishments_localities
   WHERE establishment_id IN (SELECT id FROM orphan_establishments_sans_impact);

   -- 2. Supprimer les établissements orphelins
   DELETE FROM establishments
   WHERE id IN (SELECT id FROM orphan_establishments_sans_impact);
   ```

#### 10. Colonne `source`

Fichier: [EstablishmentSource.ts](../../../../packages/models/src/EstablishmentSource.ts)

- Valeurs possibles : `'seed' | 'import' | 'portaildf'` (à vérifier)
- **Impact** : Mettre `source = 'import'` pour les nouvelles données

#### 11. Gestion du millésime

- CSV contient `Millesime: 2025`
- **Base actuelle** : Pas de colonne millésime
- **Impact** : Si ajouté, permet de tracker les versions de données

## 📋 Tâches à créer

### Phase 0 : Préparation environnement

- [ ] **[Import Établissements] Créer environnement iso-prod**
  - Créer base de données `isoprod` (copie de production)
  - Configurer accès dans `DATABASE_URL`
  - Vérifier que toutes les migrations sont appliquées

- [ ] **[Import Établissements] Snapshot AVANT import**
  - Exporter statistiques actuelles :
    ```sql
    -- Nombre total d'établissements
    SELECT COUNT(*) as total_establishments FROM establishments WHERE deleted_at IS NULL;

    -- Répartition par kind
    SELECT kind, COUNT(*) as count FROM establishments WHERE deleted_at IS NULL GROUP BY kind ORDER BY count DESC;

    -- Établissements avec/sans SIRET
    SELECT
      COUNT(*) FILTER (WHERE siret IS NOT NULL) as with_siret,
      COUNT(*) FILTER (WHERE siret IS NULL) as without_siret
    FROM establishments WHERE deleted_at IS NULL;

    -- Nombre d'utilisateurs par établissement
    SELECT e.name, COUNT(u.id) as user_count
    FROM establishments e
    LEFT JOIN users u ON u.establishment_id = e.id AND u.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
    GROUP BY e.id, e.name
    HAVING COUNT(u.id) > 0
    ORDER BY user_count DESC
    LIMIT 20;
    ```
  - Sauvegarder dans `snapshot_before_import.txt`

- [ ] **[Import Établissements] Snapshot APRÈS import**
  - Exécuter les mêmes requêtes après import
  - Sauvegarder dans `snapshot_after_import.txt`
  - Comparer les différences (diff, nombre d'ajouts/suppressions/modifications)

### Phase 1 : Analyse et préparation

- [ ] **[Import Établissements] Comparer les valeurs `Kind-admin` du CSV avec `EstablishmentKind` TypeScript**
  - Identifier les nouveaux types (ex: `ADMIN`)
  - Mettre à jour `ESTABLISHMENT_KIND_VALUES` si nécessaire
  - Vérifier l'ordre de priorité dans `ESTABLISHMENT_KIND_ORDER`

- [ ] **[Import Établissements] Analyser les doublons potentiels SIREN/SIRET**
  - Vérifier unicité du SIREN dans les CSV
  - Vérifier unicité du SIRET dans les CSV
  - Identifier les establishments existants par SIREN

- [ ] **[Import Établissements] Décider de la stratégie de nommage**
  - Utiliser `Name-zlv` (normalisé) ou `Name-source` (legacy) ?
  - Impact sur la recherche/affichage utilisateur
  - Stocker `short_name` en base ou continuer le calcul dynamique ?

- [ ] **[Import Établissements] Analyser l'impact sur `establishments_localities`**
  - La table doit-elle être reconstruite après import ?
  - Stratégie de synchronisation avec `localities_geo_code`

### Phase 2 : Migration du schéma

- [ ] **[Import Établissements] Créer migration : ajout colonne `siret`**
  - Type : `bigint` ou `string(14)` (recommandation: `bigint` pour cohérence avec SIREN)
  - Contrainte : `NOT NULL` après import, ou nullable ?
  - Index : `CREATE UNIQUE INDEX idx_establishments_siret ON establishments(siret)` (relation 1:1 vérifiée)
  - Alternative : `CREATE INDEX idx_establishments_siret ON establishments(siret)` si nullable durant migration

- [ ] **[Import Établissements] Créer migration : ajout colonne `short_name` (optionnel)**
  - Si décision de dénormaliser
  - Remplir depuis le calcul actuel pour les données existantes

- [x] **[Import Établissements] Créer migration : ajout colonne `kind_meta`** ✅ **DÉCISION VALIDÉE**
  - Type : `string` (nullable pour compatibilité avec données existantes)
  - Valeurs possibles :
    - `"Collectivité Territoriale"`
    - `"Services de l'Etat"`
    - `"Autre"` (pour ASSO, etc.)
  - Mapping depuis CSV : `Kind-admin_meta` → `kind_meta`
  - Impact sur le modèle :
    - Ajouter `kind_meta?: string` dans `EstablishmentDTO`
    - Ajouter `kind_meta: string | null` dans `EstablishmentDBO`
    - Créer enum/type `EstablishmentKindMeta` dans `packages/models`

- [ ] **[Import Établissements] Créer migration : ajout colonne `millesime` (optionnel)**
  - Type : `integer` ou `string`
  - Permet de tracker les versions de données

- [ ] **[Import Établissements] Modifier type `siren` : integer → bigint**
  - Vérifier overflow potentiel
  - Migration ALTER COLUMN avec cast

### Phase 3 : Import et mise à jour des données

- [ ] **[Import Établissements] Créer script d'import CSV**
  - Parser `entities_processed.csv` + `collectivities_processed.csv`
  - Mapper les colonnes CSV → colonnes DB
  - Gérer les arrays JSON (`Geo_Perimeter`)

- [ ] **[Import Établissements] Stratégie UPSERT basée sur SIREN**
  - `ON CONFLICT (siren) DO UPDATE SET ...`
  - Mettre à jour : `name`, `siret`, `localities_geo_code`, `kind`, `updated_at`
  - Ne PAS écraser : `id`, `source` (si déjà `portaildf`), `available`

- [ ] **[Import Établissements] Normaliser les noms (enlever MAJUSCULES legacy)**
  - Utiliser `Name-zlv` depuis CSV
  - Ou appliquer transformation (title case, etc.)

- [ ] **[Import Établissements] Resynchroniser `establishments_localities`**
  - Reconstruire depuis `localities_geo_code` mis à jour
  - Vérifier intégrité avec table `localities`

- [ ] **[Import Établissements] Mettre à jour `EstablishmentKind` TypeScript**
  - Ajouter nouveaux types identifiés
  - Mettre à jour fonctions de classification (departmental, intercommunality)

### Phase 4 : Tests et validation

- [x] **[Import Établissements] Identifier les établissements orphelins (présents en base mais absents des CSV)** ✅ **TERMINÉ**
  - Requête SQL : `SELECT * FROM establishments WHERE siren NOT IN (liste_siren_csv)`
  - ✅ Analyse réalisée sur `copieprod` : 193 établissements orphelins détectés
  - ✅ Fichiers générés :
    - [orphan_establishments_report.csv](orphan_establishments_report.csv) : Liste complète avec actions recommandées
    - [ORPHAN_ESTABLISHMENTS_REPORT.md](ORPHAN_ESTABLISHMENTS_REPORT.md) : Rapport d'analyse détaillé
  - ✅ Résultats :
    - **23 établissements avec utilisateurs actifs** → Traitement manuel requis
    - **0 établissements avec campagnes uniquement** → Aucun cas
    - **170 établissements sans utilisateurs ni campagnes** → Suppression définitive (DELETE)

- [ ] **[Import Établissements] Traiter les 23 établissements orphelins avec utilisateurs actifs**
  - [ ] Analyser les correspondances DREAL → DREETS dans les CSV (20 cas)
  - [ ] Investiguer le cas "CE d'Alsace" (SIREN 200094332) : 4 users + 8 campagnes
  - [ ] Supprimer la donnée test "Pays de Galles indépendant" (SIREN 999999999)
  - [ ] Contacter les utilisateurs concernés pour migration
  - [ ] Exécuter les migrations : `UPDATE users SET establishment_id = 'nouveau_id' WHERE establishment_id = 'ancien_id'`
  - [ ] Logger les migrations effectuées

- [ ] **[Import Établissements] Supprimer définitivement les 170 établissements orphelins sans impact**
  ```sql
  -- 1. Supprimer les relations dans establishments_localities
  DELETE FROM establishments_localities
  WHERE establishment_id IN (
    SELECT e.id FROM establishments e
    WHERE e.siren NOT IN (SELECT DISTINCT siren FROM csv_import_temp)
      AND e.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM users WHERE establishment_id = e.id AND deleted_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM campaigns WHERE establishment_id = e.id)
  );

  -- 2. Supprimer les établissements orphelins
  DELETE FROM establishments
  WHERE id IN (
    SELECT e.id FROM establishments e
    WHERE e.siren NOT IN (SELECT DISTINCT siren FROM csv_import_temp)
      AND e.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM users WHERE establishment_id = e.id AND deleted_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM campaigns WHERE establishment_id = e.id)
  );
  ```

- [ ] **[Import Établissements] Ajouter filtre par SIRET dans `establishmentRepository.filter()`**
  - Ajouter paramètre `siret?: string[]` dans `EstablishmentFiltersDTO`
  - Implémenter `builder.whereIn('siret', filters.siret)` dans la fonction `filter()`
  - Tester le filtre avec des SIRET réels

- [ ] **[Import Établissements] Intégrer SIRET dans les écrans frontend**
  - **Liste des établissements** : Afficher colonne SIRET (optionnelle/masquable)
  - **Détail établissement** : Afficher SIRET avec SIREN
  - **Formulaire création/édition** : Ajouter champ SIRET (si édition manuelle permise)
  - **Filtre de recherche** : Permettre recherche par SIRET
  - **Export CSV/Excel** : Inclure colonne SIRET

- [ ] **[Import Établissements] Tester les filtres existants**
  - Filtre par `kind` avec nouveaux types
  - Filtre par `geoCodes` après mise à jour périmètres
  - Filtre par `siren` inchangé
  - ✅ Filtre par `siret` (nouveau)
  - ✅ Filtre par `kind_meta` (nouveau)

- [ ] **[Import Établissements] Vérifier scripts Portail DF**
  - [establishment-verifier.py](../perimeters-portaildf/02-establishment-verifier/establishment-verifier.py) doit fonctionner avec SIRET
  - [user-verifier.py](../perimeters-portaildf/03-users-verifier/user-verifier.py) si impacté

- [ ] **[Import Établissements] Vérifier intégrité des relations**
  - Aucun `user` orphelin après mise à jour
  - Table `establishments_localities` cohérente
  - ✅ Aucun établissement orphelin avec utilisateurs actifs non traité

- [ ] **[Import Établissements] Tester affichage frontend**
  - Noms affichés correctement (sans MAJUSCULES legacy)
  - `shortName` calculé ou stocké fonctionne
  - Filtres et recherche opérationnels
  - ✅ SIRET affiché dans tous les écrans concernés
  - ✅ `kind_meta` affiché/utilisable si pertinent

### Phase 5 : Documentation

- [ ] **[Import Établissements] Documenter le mapping CSV → DB**
  - Quelle colonne CSV → quelle colonne DB
  - Transformations appliquées

- [ ] **[Import Établissements] Documenter la procédure d'import**
  - Script à lancer
  - Fréquence de mise à jour (annuelle ? millésime)

## 🎯 Recommandations prioritaires

1. **Ajouter `siret` en priorité** - Bloquant pour intégration Portail DF
2. **Utiliser `Name-zlv` pour normaliser les noms** - Résout le problème MAJUSCULES
3. **✅ Ajouter `kind_meta`** - **VALIDÉ** - Clarifie la distinction échelon administratif (`kind`) vs nature juridique (`kind_meta`)
4. **Stratégie UPSERT sur SIREN** - Évite de casser les relations existantes (users, campaigns)
5. **Index sur `siret`** - Performance pour jointures avec Portail DF
6. **Gérer les doublons** - Exclure les 6 doublons légitimes (collectivités à statut spécial) et les 4 erreurs de données

## 📊 Mapping CSV → Base de données (proposition)

| Colonne CSV | Colonne DB | Type | Transformation |
|-------------|------------|------|----------------|
| `Siren` | `siren` | `bigint` | Cast string → bigint |
| `Siret` | `siret` | `string(14)` ou `bigint` | Nouveau champ |
| `Name-zlv` | `name` | `string` | Direct (normalisé) |
| `Name-zlv` | `short_name` | `string` | Optionnel si dénormalisé |
| `Kind-admin` | `kind` | `string` | Mapper vers `EstablishmentKind` |
| `Kind-admin_meta` | `kind_meta` | `string` | ✅ **Nouveau champ validé** - Mapper vers `EstablishmentKindMeta` |
| `Geo_Perimeter` | `localities_geo_code` | `text[]` | Parse JSON array |
| `Millesime` | `millesime` | `integer` | Nouveau champ optionnel |
| - | `source` | `string` | Hardcodé à `'import'` |
| - | `updated_at` | `timestamp` | `NOW()` |
| - | `available` | `boolean` | Conserver valeur existante ou `false` |

## 🔗 Relations et intégrité

### Diagramme de dépendances

```
establishments
    ├── id (PK)
    ├── siren (unique)
    └── siret (nouveau, index)
        ↓
    users.establishment_id (FK)
        ↓
    campaigns.establishment_id (FK)

establishments.localities_geo_code
        ↓
    establishments_localities (table de jointure)
        ↓
    localities.geo_code
```

### Contraintes à respecter

1. **Ne pas casser les FK** : Utiliser UPDATE plutôt que DELETE/INSERT
2. **Synchroniser `establishments_localities`** : Reconstruire après update de `localities_geo_code`
3. **Préserver `users`** : Ne pas supprimer d'establishments ayant des users actifs
4. **Index performance** : Ajouter index sur `siret` pour jointures avec Portail DF
