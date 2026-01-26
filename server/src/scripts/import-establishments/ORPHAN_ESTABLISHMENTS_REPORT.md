# Rapport des Établissements Orphelins

**Date d'analyse** : 2025-11-26
**Base de données** : copieprod
**Fichiers CSV de référence** : `entities_processed.csv` + `collectivities_processed.csv`

## Résumé Exécutif

Sur les **36 737 SIREN uniques** présents dans les fichiers CSV, la comparaison avec la base de données ZLV révèle **193 établissements orphelins** (présents en base mais absents des CSV d'import).

### Vue d'ensemble

| Catégorie | Nombre | % |
|-----------|--------|---|
| **Total établissements orphelins** | 193 | 100% |
| Avec utilisateurs actifs | 23 | 11.9% |
| Avec campagnes (sans utilisateurs) | 0 | 0% |
| **Sans utilisateurs ni campagnes** | 170 | 88.1% |

### Répartition par type d'établissement

**Établissements avec utilisateurs actifs (23)** :
- SDER (Services Déconcentrés de l'État Régionaux) : 20
- DEP (Départements) : 1 (CE d'Alsace - 4 users + 8 campagnes)
- CA (Communauté d'Agglomération) : 1 (Pays de Galles indépendant - donnée test)
- PETR : 1
- REG (Région) : 1

**Établissements sans utilisateurs ni campagnes (170)** :
- Communes : ~125
- SDER/SDED (nouveaux services DREETS) : ~20
- DEP : 2 (Haute-Corse, Corse-du-Sud, Bas-Rhin)
- EPCI : 1
- CC : 2

## Analyse Détaillée

### 1. Établissements à traiter manuellement (23 cas)

Ces établissements ont des **utilisateurs actifs** et nécessitent une décision métier avant suppression.

#### Cas prioritaires (> 1 utilisateur)

| Nom | SIREN | Kind | Users | Campagnes |
|-----|-------|------|-------|-----------|
| DRIHL Ile-de-France | 130012628 | SDER | 7 | 0 |
| DEAL Martinique | 130014236 | SDER | 7 | 0 |
| DREAL Normandie | 130006265 | SDER | 5 | 0 |
| **CE d'Alsace** | 200094332 | DEP | 4 | **8** |
| DREAL Auvergne-Rhône-Alpes | 130006729 | SDER | 4 | 0 |
| DEAL Guadeloupe | 130013915 | SDER | 4 | 0 |

**❗ Cas critique : CE d'Alsace**
- 4 utilisateurs actifs + 8 campagnes
- Collectivité Européenne d'Alsace (fusion Bas-Rhin + Haut-Rhin en 2021)
- **Recommandation** : Vérifier si SIREN obsolète ou problème dans les CSV

#### Anciens services de l'État (DREAL → DREETS)

20 établissements de type SDER/SDED sont probablement des **anciennes structures réorganisées** :
- DREAL (Directions Régionales de l'Environnement, de l'Aménagement et du Logement)
- DEAL (Directions de l'Environnement, de l'Aménagement et du Logement - DOM)
- DRIHL, DRIEAT (Île-de-France)

**Hypothèse** : Réorganisation administrative → nouveaux SIREN attribués aux DREETS (Direction Régionale de l'Économie, de l'Emploi, du Travail et des Solidarités).

**Recommandation** :
1. Contacter les utilisateurs concernés pour migration vers les nouvelles structures
2. Récupérer les SIREN des DREETS correspondantes dans les CSV
3. Proposer aux utilisateurs de basculer vers le bon établissement
4. Soft delete après migration des utilisateurs

#### Donnée de test

| Nom | SIREN | Kind | Users | Campagnes | Action |
|-----|-------|------|-------|-----------|--------|
| Pays de Galles indépendant | 999999999 | CA | 1 | 1 | **Supprimer (donnée factice)** |

### 2. Établissements à évaluer (0 cas)

Aucun établissement orphelin n'a de campagnes sans utilisateurs actifs.

### 3. Établissements sans impact (170 cas - 88.1%)

Ces établissements peuvent être **supprimés en soft delete** sans risque :
- Aucun utilisateur actif
- Aucune campagne associée

**Catégories concernées** :
- ~125 **Communes** (probablement anciennes communes fusionnées ou données de test)
- ~20 **DREETS** (nouvelles structures dans les CSV, anciennes en base sous forme SDER/SDED)
- 3 **Départements** : Haute-Corse (2A), Corse-du-Sud (2B), Bas-Rhin (67)
- 2 **Communautés de communes**
- 1 **EPCI "Sans objet"** (SIREN = 0)

**Départements orphelins** :
- Haute-Corse (222000036)
- Corse-du-Sud (222000028)
- Bas-Rhin (226700011)

Ces départements ont probablement un **nouveau SIREN** dans les CSV suite à leur statut particulier (Collectivité de Corse pour 2A/2B, Collectivité Européenne d'Alsace pour 67).

## Recommandations d'Action

### Phase 1 : Analyse métier (23 établissements)

1. **Identifier les correspondances** entre anciennes et nouvelles structures
   ```sql
   -- Trouver les nouveaux SIREN des DREETS dans les CSV
   SELECT * FROM csv_import_temp
   WHERE name LIKE '%DREETS%' OR name LIKE '%DEETS%';
   ```

2. **Contacter les utilisateurs** des 23 établissements pour :
   - Confirmer le rattachement à la nouvelle structure
   - Obtenir l'accord pour migration

3. **Migration des données** :
   ```sql
   -- Exemple : migrer users de DREAL Normandie vers DREETS Normandie
   UPDATE users
   SET establishment_id = 'nouveau_id_dreets'
   WHERE establishment_id = '90128f1a-bf65-4c74-b141-fef34ec5c158'
     AND deleted_at IS NULL;
   ```

### Phase 2 : Suppression définitive (170 établissements)

Suppression définitive (DELETE) des établissements sans impact :

```sql
-- 1. Supprimer les relations dans establishments_localities
DELETE FROM establishments_localities
WHERE establishment_id IN (
  SELECT e.id
  FROM establishments e
  WHERE e.siren NOT IN (SELECT DISTINCT siren FROM csv_import_temp)
    AND e.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM users WHERE establishment_id = e.id AND deleted_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM campaigns WHERE establishment_id = e.id)
);

-- 2. Supprimer les établissements orphelins
DELETE FROM establishments
WHERE id IN (
  SELECT e.id
  FROM establishments e
  WHERE e.siren NOT IN (SELECT DISTINCT siren FROM csv_import_temp)
    AND e.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM users WHERE establishment_id = e.id AND deleted_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM campaigns WHERE establishment_id = e.id)
);
```

**Nombre prévu : 170 établissements** (+ leurs relations dans `establishments_localities`)

### Phase 3 : Cas particuliers

1. **Pays de Galles indépendant** (SIREN 999999999)
   - Supprimer la campagne associée (après vérification)
   - Supprimer l'utilisateur test
   - **Suppression définitive** de l'établissement (DELETE)

2. **CE d'Alsace** (200094332)
   - Vérifier si SIREN présent dans les CSV sous un autre nom
   - Si absent : ajouter manuellement au CSV
   - Si présent : migrer les 4 utilisateurs + 8 campagnes

## Fichiers Générés

- **orphan_establishments_report.csv** : Liste complète des 193 établissements avec recommandation d'action
- **ORPHAN_ESTABLISHMENTS_REPORT.md** : Ce rapport d'analyse

## Prochaines Étapes

- [ ] Analyser les correspondances DREAL → DREETS dans les CSV
- [ ] Contacter les 23 utilisateurs des établissements orphelins
- [ ] Exécuter la migration des utilisateurs vers les nouvelles structures
- [ ] Exécuter le soft delete des 170 établissements sans impact
- [ ] Traiter manuellement le cas "Pays de Galles indépendant"
- [ ] Investiguer le cas "CE d'Alsace" (4 users + 8 campagnes)
