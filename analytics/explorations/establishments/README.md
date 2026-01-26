## README — Etablissements (Collectivités + Entités) → Fichier Gold

Ce dossier permet de produire un fichier Gold des établissements en agrégeant deux familles de données:

- Collectivités territoriales (communes, départements, régions, EPCI, EPT, TOM, arrondissements)
- Entités de l’État et établissements publics (administration centrale, services déconcentrés régionaux/départementaux, EPA/EPIC, autres collectivités territoriales spécifiques)

Le résultat attendu est un fichier « Gold » unifié, normalisé et millésimé, prêt à être intégré dans la prod (droits, périmètres, référentiels). Il corrige les défauts identifiés: périmètres obsolètes, incohérences de nommage, confusion des types d’échelons vs natures juridiques, et absence de SIRET.

### Résultat (Gold) — Champs cibles

- UID: identifiant stable (à générer lors de l’intégration Prod, p.ex. hash des colonnes clés)
- Siren, Siret: identifiants légaux (Siret = siège lorsque dispo)
- Layer-geo: niveau géographique d’application du périmètre (National, Région, Département, Intercommunalité, Commune, TOM, Arrondissement)
- Kind_geo: typologie géo normalisée (ex: REG, DEP, EPCI, COM, ARR, TOM, National)
- Layer-admin: macro-famille (Collectivité Territoriale, Services de l’État, Établissement Public, Autre Collectivité Territoriale)
- Kind_admin_meta: méta-typologie admin (idem Layer-admin)
- Kind_admin: sous-type (REG, DEP, COM, EPT, ME/CU/CA/CC, ACT, ADMIN, EPIC-EPA, DREAL, DDT, Préfecture, etc.)
- Kind_admin-label: libellé humain (Région, Département, Commune, Établissement Public Territorial…)
- Name-zlv: nom harmonisé ZLV
- Geo Perimeter: liste des codes communes INSEE couverts
- Dep Code / Dep Name: liste des codes/noms départements couverts
- Reg Code / Reg Name: liste des codes/noms régions couverts
- Millesime: année de millésime (ex: 2025)
- Updated at / Suspended at / Suspended cause / Deleted at: réservés à la prod

Remarque: les scripts produisent déjà la plupart de ces champs (avec des noms très proches). Une étape de « rename » et d’enrichissement (UID, dates) est indiquée plus bas pour finaliser le Gold.

## Sources de données

- INSEE — Table d’appartenance des communes (COG {2025}) et listes structurantes
  - Communes + arrondissements municipaux
  - Départements (+ TOM spécifiques)
  - Régions
  - EPCI à fiscalité propre (composition communale)
  - EPT (composition communale)
- BANATIC — Correspondances codes INSEE ↔ SIREN pour communes (utilisé via fichiers Excel de composition/mapping)
- API Entreprises — `https://recherche-entreprises.api.gouv.fr/search`
  - Récupération SIREN/SIRET et métadonnées (notamment ‘siege’, région/département)
  - Filtre par nature_juridique (voir tableau ci-dessous)
- INSEE — Catégories juridiques (niveau 3)
  - 7120: Administration centrale
  - 7171: Service déconcentré à compétence (inter) régionale
  - 7172: Service déconcentré à compétence (inter) départementale
  - 7220/7225/7229/7230…: Collectivités territoriales (dont ACT)
  - 7389: EPA (ANAH, CEREMA, ANCT…)
  - 4110: EPIC dotés d’un comptable public (CSTB, ADEME…)
  - 7490: Autre personne morale de droit administratif (CDC)
- Base Sirene (Parquet local) — utilisée pour reconstruire SIRET depuis SIREN (NIC du siège)
- Fichiers locaux du dossier `data/`
  - `EPCI.xlsx` (onglets `EPCI`, `Composition`)
  - `EPT.xlsx` (onglets `EPT`, `Composition`)
  - `mapping_siren_insee.csv` (commune INSEE → SIREN, séparateur `;`)

## Architecture des scripts

- `collectivities.py`
  - Télécharge/charge les tables INSEE (COG {2025}) et les fichiers `EPCI.xlsx` / `EPT.xlsx` / `mapping_siren_insee.csv`
  - Construit les périmètres géo (listes de codes communes) pour: Régions, Départements, EPCI (ME/CU/CA/CC), EPT, Communes, TOM (collectivités + communes), Arrondissements (dont Paris > cas particulier)
  - Normalise les codes (décimaux, padding, 2A/2B) et les noms ZLV (suppression de préfixes « Communauté de… », ajout du code dép dans le nom EPCI, etc.)
  - Récupère SIREN/SIRET via: mapping INSEE↔SIREN + requêtes DuckDB dans le parquet Sirene, ou API Entreprises (collectivités)
  - Sorties: `collectivities_processed.csv` et `.xlsx`

- `entities.py`
  - Charge `collectivities_processed.csv` pour bâtir des lookup géographiques (communes par région/département)
  - Interroge l’API Entreprises par familles: Administration centrale (7120), Établissements publics (7389/4110/7490), Services régionaux (7171), Services départementaux (7172), Autres collectivités territoriales (7229)
  - Filtre/normalise (exclusions police, sélection stricte des sigles, cartographie des ACT, capitalisation du Name-zlv, périmètres « National » pour AC/EPA, périmètres régionaux/départementaux pour services)
  - Sorties: `entities_processed.csv` et `.xlsx`

## Étapes de création

### 1) Prérequis

- Python 3.10+ et librairies: pandas, numpy, duckdb, requests, requests-cache, tqdm, openpyxl (pour Excel)
- Fichiers présents dans `data/` (voir section "Téléchargement des fichiers sources" ci-dessous)
- Base Sirene (Parquet) disponible localement: `StockUniteLegale_utf8.parquet`
- Connexion internet pour charger les COG (via data.gouv) et appeler l'API Entreprises
- Les caches se créeront automatiquement: `cache.sqlite` (INSEE/data.gouv) et `api_entreprise_cache.sqlite` (API Entreprises)

### Téléchargement des fichiers sources

| Fichier | Source | URL de téléchargement |
|---------|--------|----------------------|
| `data/EPCI.xlsx` | INSEE | https://www.insee.fr/fr/information/2510634 → "Télécharger EPCI" (zip) |
| `data/EPT.xlsx` | INSEE | https://www.insee.fr/fr/information/2510634 → "Télécharger EPT" (zip) |
| `data/mapping_siren_insee.csv` | BANATIC / data.gouv.fr | https://www.data.gouv.fr/datasets/table-de-correspondance-entre-ndeg-siren-et-code-insee-des-communes |
| `StockUniteLegale_utf8.parquet` | Base Sirene | https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret |

> **Note**: Extraire les fichiers EPCI et EPT des archives ZIP et les renommer si nécessaire (ex: `EPCI_au_01-01-2025.xlsx` → `EPCI.xlsx`)

Installation rapide (exemple):

```bash
uv pip install pandas numpy duckdb requests requests-cache tqdm openpyxl
# ou
pip install pandas numpy duckdb requests requests-cache tqdm openpyxl
```

### 2) Générer les Collectivités

Commande:

```bash
python collectivities.py
```

Points clés implémentés:

- Normalisation des codes: gestion des décimaux, `zfill`, et conservation des codes alphanumériques (2A/2B)
- Périmètres géo par type:
  - Régions: toutes les communes de la région; Départements: toutes les communes du département
  - EPCI/EPT: composition communale (onglets `Composition`)
  - Communes: périmètre = {code commune}; TOM: cas dédiés (communes + collectivités TOM)
  - Arrondissements: extraction spécifique pour Paris (recherche Sirene via DuckDB), Lyon/Marseille sans SIRET connu
- SIREN/SIRET:
  - Communes: mapping INSEE→SIREN puis SIRET via NIC de siège (Parquet Sirene)
  - Régions/Départements: API Entreprises `code_collectivite_territoriale`
  - EPCI/EPT: SIRET depuis SIREN (Parquet Sirene)
- Nommage ZLV:
  - Nettoyage des préfixes (CU/CA/CC), ajout `(DEP)` pour lever les ambiguïtés inter-départementales
- Sorties: `collectivities_processed.csv`, `collectivities_processed.xlsx`

### 3) Générer les Entités

Commande:

```bash
python entities.py
```

Points clés implémentés:

- Lecture de `collectivities_processed.csv` pour construire les périmètres (toutes communes d’une région/d’un département)
- Appels API Entreprises avec pagination + cache local, filtrage fin:
  - Administration centrale (7120): périmètre National
  - Établissements publics (7389/4110/7490): périmètre National
  - Services régionaux (7171): périmètre = communes de la région `siege.region`
  - Services départementaux (7172): périmètre = communes du département `siege.departement`
  - ACT (7229): liste sélectionnée, exclusions explicites, mapping des noms (capitalisation)
- Sécurisation:
  - Exclusion des entités non pertinentes (ex: POLICE)
  - Fallback sur sigle quand absent; vérifications d’appartenance (sigle dans `nom_complet`)
- Sorties: `entities_processed.csv`, `entities_processed.xlsx`

### 4) Fusion → Fichier Gold

Union des deux jeux déjà normalisés, alignement de schéma et renommage final des colonnes.

Commande rapide (exemple) pour produire `gold_establishments.csv`:

```bash
python - << 'PY'
import pandas as pd

c = pd.read_csv('collectivities_processed.csv')
e = pd.read_csv('entities_processed.csv')

# Harmonisation des noms de colonnes en vue du Gold
rename_map = {
    'Geo_Perimeter': 'Geo Perimeter',
    'Dep_Code': 'Dep Code',
    'Dep_Name': 'Dep Name',
    'Reg_Code': 'Reg Code',
    'Reg_Name': 'Reg Name',
    'Layer-geo_label': 'Layer-geo'
}

c = c.rename(columns=rename_map)
e = e.rename(columns=rename_map)

gold = pd.concat([c, e], ignore_index=True)

# Colonnes cibles (ajout placeholders s’il manque)
for col in ['UID', 'Kind_geo', 'Layer-admin', 'Updated at', 'Suspended at', 'Suspended cause', 'Deleted at']:
    if col not in gold.columns:
        gold[col] = None

# Déduction simple de Layer-admin (si non fourni)
def infer_layer_admin(row):
    fam = row.get('Kind-admin_meta') or row.get('Kind_admin_meta')
    if fam:
        return fam
    # fallback
    k = row.get('Kind-admin')
    if k in {'REG','DEP','COM','ARR','EPT','ME','CU','CA','CC','TOM'}:
        return 'Collectivité Territoriale'
    if k in {'ADMIN','DREAL','DREETS','DRFIP','DRIHL','DRIEAT','DRIEETS','DEAL','DDT','DDTM','DDETS','DDETSPP','PREF','DDFIP','DID'}:
        return "Services de l'État"
    if k in {'EPIC-EPA'}:
        return 'Établissement Public'
    if k in {'ACT'}:
        return 'Autre Collectivité Territoriale'
    return None

if 'Layer-admin' not in gold.columns or gold['Layer-admin'].isna().any():
    gold['Layer-admin'] = gold.apply(infer_layer_admin, axis=1)

gold.to_csv('gold_establishments.csv', index=False)
print('✔ gold_establishments.csv écrit')
PY
```

Remarques:

- La génération de `UID` et la gestion des champs d’audit (Updated/Suspended/Deleted) sont à réaliser côté prod.
- Si besoin de stricte parité avec le schéma « Gold » (renommage, ordre des colonnes), effectuer un `reindex` final.

## Problèmes résolus par la chaîne

- Actualisation des périmètres: recalcul complet depuis COG {2025} + compositions (EPCI/EPT) → périmètres géo fiables et millésimés
- Legacy de nommage: normalisation `Name-zlv` (suppression des préfixes, capitalisation), harmonisation des familles/types (`Kind_admin_meta`, `Kind_admin`, `Kind_admin-label`)
- Confusion échelon vs nature juridique: séparation claire entre « Layer-geo » (où s’applique le périmètre) et « Layer-admin »/« Kind_admin* » (nature/organisation)
- Absence de SIRET: reconstruction systématique (Sirene parquet) ou récupération du `siege.siret` (API Entreprises)

## Complexités et limites connues

- Codes atypiques et TOM: gestion des 2A/2B, codes décimaux importés, TOM sans région → périmètres hybrides et cas particuliers
- API Entreprises: pagination, filtrage par `nature_juridique`, disambiguïsation des résultats (sigle, exclusions Police), limites de taux (attente/caching)
- Sirene parquet local: chemin à configurer (`PARQUET_PATH`) et présence du NIC siège; erreurs DuckDB possibles si le fichier est absent/renommé
- Arrondissements de Paris: heuristiques spécifiques (requêtes texte dans Sirene); Lyon/Marseille sans SIRET siège facilement récupérable
- Nommage EPCI: normalisation des préfixes + suffixe (code dép) pour lever les ambiguïtés inter-départementales
- Convergence de schéma: petites divergences de noms (underscore vs espace) → étape de renommage avant Gold

## Fréquence d’actualisation

- Millésime fixé dans les scripts (`MILLESIME = "2025"`). Re-générer à chaque publication COG (annuelle) et/ou évolution des listes d’entités (sélections produits)
- Caches API (`api_entreprise_cache.sqlite`) et chargements INSEE (`cache.sqlite`) peuvent être purgés pour forcer une actualisation complète

Purge manuelle des caches (facultatif):

```bash
rm -f api_entreprise_cache.sqlite cache.sqlite
```

## Contrôles qualité recommandés

- Comptages par type (`Kind-admin`) et par famille (`Kind_admin_meta`)
- Existence de SIREN/SIRET pour chaque ligne, avec priorité au SIRET du siège
- Couverture des périmètres (ex: somme des communes par région vs COG)
- Cas particuliers audités: Paris, Corse (2A/2B), TOM, EPCI multi-départements

## Commandes — Récapitulatif

```bash
# 1) Collectivités
python collectivities.py

# 2) Entités (nécessite le CSV des collectivités)
python entities.py

# 3) Fusion (Gold)
# produit gold_establishments.csv dans ce dossier
python - << 'PY'
import pandas as pd
c = pd.read_csv('collectivities_processed.csv').rename(columns={'Geo_Perimeter':'Geo Perimeter','Dep_Code':'Dep Code','Dep_Name':'Dep Name','Reg_Code':'Reg Code','Reg_Name':'Reg Name','Layer-geo_label':'Layer-geo'})
e = pd.read_csv('entities_processed.csv').rename(columns={'Geo_Perimeter':'Geo Perimeter','Dep_Code':'Dep Code','Dep_Name':'Dep Name','Reg_Code':'Reg Code','Reg_Name':'Reg Name','Layer-geo_label':'Layer-geo'})
gold = pd.concat([c,e], ignore_index=True)
for col in ['UID','Kind_geo','Layer-admin','Updated at','Suspended at','Suspended cause','Deleted at']:
    if col not in gold.columns:
        gold[col] = None
gold.to_csv('gold_establishments.csv', index=False)
print('✔ gold_establishments.csv écrit')
PY
```

## Notes de mise en prod

- L’UID et les champs d’audit doivent être gérés par le système amont (DBT/Dagster), ou via un script d’intégration dédié
- Le schéma final peut être « figé » via un modèle silver→gold, en renommant systématiquement les colonnes et en appliquant les règles d’UID
- En cas d’évolution des sélections produit (listes d’entités), adapter les constantes en tête de `entities.py`
