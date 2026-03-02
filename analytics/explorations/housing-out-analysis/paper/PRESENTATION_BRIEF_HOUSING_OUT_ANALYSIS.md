# Dossier complet pour presentation - Analyse des sorties de vacance

> Objectif: fournir un document source complet pour generer une presentation (10 a 15 slides) sur l'analyse des facteurs de sortie de vacance, y compris le role de l'usage ZLV.

---

## 1) Contexte, question business et message central

### Contexte

ZLV (Zero Logement Vacant) est une application de l'Etat qui aide les collectivites a suivre et reduire la vacance des logements.  
L'enjeu de cette analyse est de comprendre:

1. Quels facteurs sont associes a la sortie de vacance.
2. Comment interpreter l'effet apparent de l'usage ZLV.

### Question analytique

"Parmi les logements vacants, quels profils sortent de la vacance, et dans quelles conditions territoriales et proprietaires ?"

### Variable cible

- `is_housing_out`:
  - `1`: logement sorti de vacance (present LOVAC 2024, absent LOVAC 2025)
  - `0`: logement toujours vacant (toujours present LOVAC 2025)

### Message central (version executive)

- Les facteurs les plus discriminants sont surtout lies au profil proprietaire et a l'historique de vacance.
- Les facteurs geographiques jouent un role de contexte (gradient urbain/rural, dynamisme de marche).
- Les variables "usage ZLV" doivent etre interpretees avec prudence (biais de selection, non causalite brute).

---

## 2) Perimetre de donnees et ordre de grandeur

### Population analysee

- **2,529,730** logements vacants analyses
- **1,181,700** sorties de vacance
- **46.71%** de taux de sortie global

### Granularite

- Un enregistrement = un logement (`housing_id`)
- Jointures 1:1 sur `housing_id` entre marts BI

### Sources de reference (dbt marts analysis)

- `main_marts.marts_bi_housing_characteristics`
- `main_marts.marts_bi_housing_geography`
- `main_marts.marts_bi_housing_owners`
- `main_marts.marts_bi_housing_zlv_usage`

Tables support:

- `marts_analysis_housing_out_features` (table housing-level plus large)
- `marts_analysis_city_aggregated` (agregation commune)

---

## 3) Architecture data et lineage des tables utilisees

## Niveau "cible + dimensions analytiques"

- Base cible: `int_analysis_housing_with_out_flag` (contient `is_housing_out`)
- Enrichissements:
  - Caracteristiques logement via `int_production_housing`
  - Geographie via `int_analysis_city_features`, `marts_common_cities`, tables morphologie
  - Proprietaires via `int_analysis_housing_owners`
  - Usage ZLV via `int_analysis_housing_establishment_echelons` + `int_analysis_establishments_zlv_usage`

### Dependances principales (dbt `ref`)

- `marts_bi_housing_characteristics` <- `int_analysis_housing_with_out_flag`, `int_production_housing`
- `marts_bi_housing_geography` <- `int_analysis_housing_with_out_flag`, `int_analysis_city_features`, `int_production_housing`, `marts_common_cities`, `marts_public_establishments_morphology*`
- `marts_bi_housing_owners` <- `int_analysis_housing_with_out_flag`, `int_analysis_housing_owners`
- `marts_bi_housing_zlv_usage` <- `int_analysis_housing_with_out_flag`, `int_analysis_housing_establishment_echelons`, `int_analysis_establishments_zlv_usage`

---

## 4) Inventaire des features (exhaustif par categorie)

L'analyse Python est structuree en 4 familles:

1. `caracteristiques`
2. `geographie`
3. `proprietaires`
4. `zlv_usage`

### Comptage des features analysees (run principal)

- **Caracteristiques**: 29 features
  - 16 categorielles
  - 4 booleennes
  - 9 continues
- **Geographie**: 64 features
  - 21 categorielles
  - 7 booleennes
  - 36 continues
- **Proprietaires**: 21 features
  - 7 categorielles
  - 11 booleennes
  - 3 continues
- **ZLV usage**: 39 features
  - 4 categorielles
  - 23 booleennes
  - 12 continues

### Total

- **153 features** analysees au total dans le run global.

---

## 5) Cohortes et stratifications

## Cohorte principale

- Tous les logements vacants eligibles avec cible `is_housing_out`.

### Stratifications disponibles (config)

La configuration de stratification prevoit **22 variables** (geo + caracteristiques + proprietaires + ZLV), par ex:

- Densite (`densite_label`, `densite_category`)
- Programmes (`action_coeur_de_ville`, `petite_ville_de_demain`)
- Tension (`is_in_tlv_territory`)
- Logement (`housing_kind`, `vacancy_duration_category`, `is_energy_sieve`)
- Proprietaire (`owner_age_category`, `owner_is_individual`, `owner_is_local`, `owner_is_multi_owner`)
- Usage ZLV (`epci_ouvert`, `epci_a_1_campagne_envoyee`)

### Stratification executee dans les sorties actuelles

- `action_coeur_de_ville`:
  - **ACV**: 387,310 logements | 53.70% de sortie
  - **Hors ACV**: 2,142,420 logements | 45.45% de sortie

---

## 6) Methode analytique (ce qui a ete fait)

### 6.1 Analyse univariee par feature

Pour chaque feature:

1. Calcul des taux de sortie par modalite (`AVG(is_housing_out) * 100`)
2. Calcul du multiplicateur modalite vs global
3. Calcul d'un score d'impact:
   - `impact_score = taux_max / taux_min`

### 6.2 Traitement selon type de variable

- **Categorielle**:
  - Group by modalite
  - Filtre modalites faibles effectifs (`HAVING COUNT(*) >= 500`)
- **Booleenne**:
  - Deux modalites (labels metier custom)
- **Continue**:
  - Decoupage en quantiles avec `NTILE(10)` (deciles)
  - Comparaison des buckets extremes et intermediaires

### 6.3 Analyse stratifiee

- Meme logique, mais "dans chaque sous-population" (strate)
- Seuil plus bas par cellule (`min_count = 100`)
- Pour les continues stratifiees: `NTILE(10)` **par strate** (`PARTITION BY stratum`)
- Sorties:
  - `multiplier` vs global
  - `stratum_multiplier` vs taux moyen de la strate

---

## 7) Exclusions, hygiene analytique et limites techniques

### Variables explicitement exclues (scripts)

- Exclusions de type tautologique / non actionnable:
  - Exemples proprietaires: `owner_kind_class`, `owner_kind_category` (artefacts source)
  - Exemple caracteristiques: `data_source` (tautologique)

### Artefacts detectes dans les resultats

- Modalites "Inconnu" parfois a 100% ou tres faibles, pouvant gonfler l'impact.
- Exemples frequents:
  - `is_taxed` (COALESCE de `NULL` dans "Non taxe")
  - `owner_age_category` / `owner_generation` (modalite inconnu tres atypique)

### Limites

- Analyse descriptive (association, pas causalite).
- Sensible aux biais de couverture et de qualite de certaines variables.
- Effets potentiels de confounding (territoire, segment proprietaire, anciennete vacance).

---

## 8) Resultats globaux - Top facteurs (toutes categories)

Top 10 par impact (sortie existante `complete_insights.md`):

1. `owner_age_category` - x5.03 (69.7% vs 13.8%)
2. `owner_generation` - x4.94 (68.4% vs 13.8%)
3. `is_taxed` - x3.98 (79.5% vs 20.0%)
4. `vacancy_severity` - x3.93 (66.9% vs 17.0%)
5. `vacancy_duration_category` - x3.88 (66.1% vs 17.0%)
6. `owner_is_company` - x3.68 (53.3% vs 14.5%)
7. `cadastral_classification_label` - x3.20 (93.1% vs 29.1%)
8. `has_recent_mutation` - x3.10 (52.0% vs 16.8%)
9. `rental_value_category` - x2.54 (100.0% vs 39.4%)
10. `condominium` - x2.54 (100.0% vs 39.4%)

Lecture executive:

- Le signal principal vient des dimensions proprietaires + cycle de vacance.
- Les signaux tres eleves incluant "Inconnu" ou 100% doivent etre interpretes avec vigilance.

---

## 9) Resultats par domaine

### 9.1 Caracteristiques logement (points forts)

- `vacancy_duration_category`: 3-5 ans a 66.1% vs 0-2 ans a 17.0%
- `vacancy_severity`: "Moderee" 66.9% vs "Legere" 17.0%
- `has_recent_mutation`: pas de mutation recente 52.0% vs mutation recente 16.8%
- `energy_consumption_category`: gradient modere, moins discriminant que duree/severite

Interpretation:

- Le cycle de vacance est un determinant majeur.
- Les cases "fraichement vacantes" ou "nouvelle mutation" sont moins susceptibles de sortir immediatement.

### 9.2 Geographie

- Gradient urbain/rural net:
  - Urbain dense ~53.6% vs rural tres disperse ~35.5%
- Marche:
  - `dvf_total_transactions_2019_2024` Q10 = 56.8% vs Q1 = 36.5%
- Demographie:
  - `population_2022` Q10 = 56.6% vs Q1 = 36.6%
- Programmes:
  - ACV: 53.7% vs hors ACV: 45.5%

Interpretation:

- Le contexte territorial contraint fortement les probabilites de sortie.
- Le marche et la densite jouent comme accelerateurs structurels.

### 9.3 Proprietaires

- `owner_is_company`: non societe 53.3% vs societe 14.5%
- `owner_location_relative_label`: meme departement 63.9% vs segments eloignes plus bas
- `owner_portfolio_category`: 10+ logements 59.5% vs mono-proprietaire 43.6%
- Contactabilite (`owner_has_phone`, `owner_contactable`) tres elevée mais echantillons faibles

Interpretation:

- Type de detenteur, proximite et professionnalisation (portefeuille) sont structurants.

### 9.4 Usage ZLV

- Impacts plus faibles (top autour de x1.2 a x1.36)
- Exemples:
  - `city_campagnes_envoyees` x1.36
  - `city_groupes_crees` x1.34
  - `city_logements_maj_situation` x1.31
  - `epci_type_detaille` x1.28

Interpretation:

- Ne pas lire ces effets comme preuve causale directe.
- Le pattern est coherent avec des effets de selection des cas difficiles.

---

## 10) Focus cohortes ACV vs Hors ACV (analyse stratifiee)

### Taux moyen par cohorte

- ACV: **53.70%**
- Hors ACV: **45.45%**

### Top facteurs dans ACV

1. `owner_age_category` x3.79
2. `owner_generation` x3.70
3. `vacancy_severity` x3.41
4. `vacancy_duration_category` x3.39
5. `owner_is_company` x3.24

### Top facteurs hors ACV

1. `owner_age_category` x5.27
2. `owner_generation` x5.18
3. `is_taxed` x4.20
4. `vacancy_severity` x4.02
5. `vacancy_duration_category` x3.97

### Message de lecture

- Les determinants centraux restent globalement stables entre cohortes.
- Hors ACV montre des contrastes plus marques sur certaines dimensions (ex. fiscalite).
- ACV a un niveau de base plus eleve de sortie, mais avec des mecanismes de segmentation similaires.

---

## 11) Biais et garde-fous d'interpretation (important pour la slide "risques")

### 11.1 Biais de selection ZLV

- Les logements les plus complexes sont plus souvent suivis/intensivement traites.
- Une association "plus d'usage ZLV -> moins de sorties" peut etre un artefact de ciblage.
- Ne pas conclure "ZLV inefficace" sur les comparaisons brutes.

### 11.2 Variables tautologiques ou quasi tautologiques

- Certaines variables peuvent encoder indirectement la cible ou la qualite de saisie.
- Exemple classique: modalites "Inconnu" a 100% sur certains champs.

### 11.3 Causalite

- Les analyses presentes sont descriptives.
- Pour une inference causale robuste: matching, regression multivariee, ou quasi-experimental.

---

## 12) Recommandations analytiques pour approfondissement

### Priorites methodologiques

1. Nettoyer/recoder les modalites `Inconnu` a fort risque d'artefact.
2. Recalculer certains indicateurs avec exclusions explicites (`NULL` vs `FALSE`).
3. Lancer analyses causales:
   - Propensity score matching
   - Modeles logistiques avec controles
   - Eventuellement difference-in-differences selon temporalite d'activation territoriale

### Variables de controle minimales pour l'impact ZLV

- Densite
- Zonage
- Dynamisme de marche
- Duree de vacance
- Type proprietaire
- Performance energetique
- Proximite proprietaire

---

## 13) Plan de presentation recommande (10 a 15 slides)

## Version 12 slides (recommandee)

1. **Problematique et objectif**: pourquoi analyser les sorties de vacance et question sur l'effet ZLV.
1. **Perimetre et donnees**: 2.53M logements, 46.71% de sorties, definition de la cible.
1. **Architecture data / lineage**: 4 marts BI et tables intermediaires.
1. **Methode analytique**: univariate, impact score, deciles, seuils minimum.
1. **Inventaire des features**: 153 features et repartition par domaine.
1. **Top facteurs globaux**: tableau Top 10 des impacts.
1. **Focus caracteristiques logement**: duree, severite, mutation.
1. **Focus geographie**: gradient urbain-rural, marche, ACV.
1. **Focus proprietaires**: type, age, proximite, portefeuille.
1. **Focus usage ZLV**: resultats bruts et message biais de selection.
1. **Analyse stratifiee ACV vs hors ACV**: niveaux de sortie et top facteurs par cohorte.
1. **Conclusions et feuille de route**: actions metier et prochaines etapes causales.

### Option extension 15 slides

Ajouter:

1. Slide "qualite des donnees et exclusions"
1. Slide "risques d'interpretation / non causalite"
1. Slide "plan d'action data + policy"

---

## 14) Narratif pret a l'emploi (texte concis pour oral)

"Nous avons analyse 2.53 millions de logements vacants, dont 1.18 million sont sortis de vacance, soit 46.7%.  
Les facteurs les plus discriminants sont surtout lies au proprietaire (type, age, profil) et au cycle de vacance (duree, severite, mutation recente).  
Le contexte territorial joue un role structurant avec un gradient net urbain-rural et un effet de dynamisme de marche.  
Les metriques d'usage ZLV montrent des associations plus modestes et doivent etre lues avec prudence car elles sont sujettes a un biais de selection: les cas les plus difficiles sont aussi les plus suivis.  
En stratifiant ACV vs hors ACV, on observe un taux de sortie plus eleve en ACV (53.7% vs 45.5%), avec des determinants globalement similaires.  
La prochaine etape est une analyse causale robuste apres nettoyage cible des artefacts de donnees."

---

## 15) Donnees et scripts utilises (traceabilite)

### Dossier exploration utilise

- `analytics/explorations/housing-out-analysis/paper/`
  - `run_analysis.py`
  - `run_stratified_analysis.py`
  - `stratification_config.py`
  - `utils.py`
  - `analyze_characteristics.py`
  - `analyze_geography.py`
  - `analyze_owners.py`
  - `analyze_zlv_usage.py`
  - `outputs/*.md` (resultats)

### Dossier dbt analyse utilise

- `analytics/dbt/models/marts/analysis/`
  - `marts_bi_housing_characteristics.sql`
  - `marts_bi_housing_geography.sql`
  - `marts_bi_housing_owners.sql`
  - `marts_bi_housing_zlv_usage.sql`
  - `marts_analysis_housing_out_features.sql`
  - `marts_analysis_city_aggregated.sql`
  - `schema.yml`
  - `CLAUDE.md`

---

## 16) Notes de prudence (a transmettre a l'IA qui generera le PowerPoint)

1. Ne pas presenter les impacts comme des effets causaux.
2. Toujours signaler les artefacts "Inconnu" et les risques de mauvaise interpretation.
3. Pour les slides ZLV, inclure explicitement la notion de biais de selection.
4. Distinguer:
   - Ce qui est "signal robuste"
   - Ce qui est "signal possiblement biaise"
5. Conserver les ordres de grandeur exacts (N et taux globaux).
