# Analyse des facteurs de sortie de vacance - Méthodologie Simple

> **Document généré le**: Janvier 2026  
> **Source**: Tables marts_bi_housing_* (MotherDuck)  
> **Base**: 2,529,730 logements vacants | 1,181,700 sorties de vacance | **Taux global: 46.71%**

---

## Méthodologie

**Calcul du taux de sortie:**

```
Taux de sortie = N_sorties / N_total × 100
```

**Calcul de l'impact (multiplicateur):**

```
Impact = Taux_max / Taux_min (entre catégories valides, hors "Inconnu")
```

**Convention:**

- ⚠️ = Donnée suspecte (artefact de données ou biais)
- ✅ = Analyse fiable
- Les catégories "Inconnu" avec taux anormaux (100% ou très bas) sont signalées comme artefacts

---

## Sommaire des TOP Features

| Rang | Feature | Impact | Meilleur taux | Plus bas taux | Fiabilité |
|------|---------|--------|---------------|---------------|-----------|
| 1 | owner_is_company | x 3.68 | 53.3% (Particulier) | 14.5% (Société) | ✅ Fiable |
| 2 | has_recent_mutation | x 2.89 | 52.1% (Pas de mutation) | 18.1% (Mutation récente) | ✅ Fiable |
| 3 | is_taxed | x 2.65 | 52.9% (Non taxé) | 20.0% (Taxé) | ⚠️ Données corrigées |
| 4 | vacancy_duration | x 2.58 | 69.0% (3-5 ans) | 26.8% (0-2 ans) | ✅ Fiable |
| 5 | vacancy_severity | x 2.55 | 68.3% (Modérée) | 26.8% (Légère) | ✅ Fiable |
| 6 | group_intensity (ZLV) | x 2.38 | 55.2% (Aucun groupe) | 23.2% (4+ groupes) | ⚠️ Biais de sélection |
| 7 | cadastral_classification | x 1.83 | 53.1% (Confortable) | 29.1% (Très médiocre) | ✅ Fiable |
| 8 | owner_location | x 1.66 | 63.9% (Même département) | 38.6% (Même région) | ✅ Fiable |
| 9 | densite_label_7 | x 1.51 | 53.6% (Urbain dense) | 35.5% (Rural dispersé) | ✅ Fiable |
| 10 | owner_portfolio | x 1.36 | 59.5% (10+ logements) | 43.6% (1 logement) | ✅ Fiable |

**Note**: Les features `owner_age_category` et `owner_generation` ont des "Inconnu" suspects (14%) qui gonflent artificiellement l'impact. L'impact réel (hors Inconnu) est ~x1.26 (70% vs 55%).

---

## 1. PROPRIÉTAIRES

### 1.1 `owner_age_category` - Âge du propriétaire

| Catégorie | N Total | N Sorties | Taux de sortie |
|-----------|---------|-----------|----------------|
| **Moins de 40 ans** | 97,949 | 68,274 | **69.70%** |
| 40-59 ans | 404,336 | 250,465 | 61.94% |
| 60-74 ans | 435,302 | 246,980 | 56.74% |
| 75 ans et plus | 450,205 | 248,598 | 55.22% |
| Non applicable (PM) | 669,173 | 301,921 | 45.12% |
| ⚠️ Age inconnu | 472,765 | 65,462 | **13.85%** |

**Impact**: x 5.03 (69.7% / 13.9%)

**Interprétation**:

- Les jeunes propriétaires (<40 ans) ont le meilleur taux de sortie (70%)
- Gradient clair: plus le propriétaire est jeune, plus il agit vite
- ⚠️ "Age inconnu" (14%) = probablement des données LOVAC non enrichies ou successions complexes

---

### 1.2 `owner_generation` - Génération du propriétaire

| Génération | N Total | N Sorties | Taux de sortie |
|------------|---------|-----------|----------------|
| **Millennial** (1981-1996) | 162,539 | 111,136 | **68.37%** |
| Generation Z (1997-2012) | 9,262 | 6,114 | 66.01% |
| Generation X (1965-1980) | 360,573 | 218,722 | 60.66% |
| Baby Boomer (1946-1964) | 544,533 | 305,406 | 56.09% |
| Silent Generation | 310,885 | 172,939 | 55.63% |
| Non applicable | 669,173 | 301,921 | 45.12% |
| ⚠️ Inconnu | 472,765 | 65,462 | **13.85%** |

**Impact**: x 4.94 (68.4% / 13.9%)

**Interprétation**:

- Même pattern que l'âge (redondant avec owner_age_category)
- Millennials et Gen Z sont les meilleurs "convertisseurs"

---

### 1.3 `owner_is_company` - Type de propriétaire ✅

| Type | N Total | N Sorties | Taux de sortie |
|------|---------|-----------|----------------|
| **Particulier** | 2,100,256 | 1,119,436 | **53.30%** |
| **Société** | 429,474 | 62,264 | **14.50%** |

**Impact**: x 3.68 (53.3% / 14.5%)

**Interprétation**:

- Les particuliers ont un taux de sortie **3.7x plus élevé** que les sociétés
- Les sociétés détiennent souvent des logements pour raisons fiscales/patrimoniales
- Piste d'action: approche différenciée pour les sociétés

---

### 1.4 `owner_location_relative_label` - Localisation du propriétaire ✅

| Localisation | N Total | N Sorties | Taux de sortie |
|--------------|---------|-----------|----------------|
| **Même département** | 648,385 | 414,399 | **63.91%** |
| Autre région | 214,367 | 110,124 | 51.37% |
| Inconnu | 821,901 | 331,403 | 40.32% |
| **Même région (autre dept)** | 845,077 | 325,774 | **38.55%** |

**Impact**: x 1.66 (63.9% / 38.6%)

**Interprétation**:

- Les propriétaires locaux (même département) ont le meilleur taux (64%)
- Curieusement, "Autre région" (51%) > "Même région" (39%)
- Les propriétaires "même région autre département" peuvent être des héritiers éloignés

---

### 1.5 `owner_has_phone` - Propriétaire avec téléphone ⚠️

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Avec téléphone** | 4,591 | 3,729 | **81.22%** |
| Sans téléphone | 2,525,139 | 1,177,971 | 46.65% |

**Impact**: x 1.74 (81.2% / 46.7%)

**⚠️ Attention au biais**:

- Seulement **0.18%** des propriétaires ont un téléphone enregistré
- Ces propriétaires sont probablement déjà engagés dans une démarche ZLV
- Le taux de 81% n'est PAS généralisable à tous les propriétaires contactables

---

### 1.6 `owner_portfolio_category` - Taille du patrimoine ✅

| Portfolio | N Total | N Sorties | Taux de sortie |
|-----------|---------|-----------|----------------|
| **Plus de 10 logements** | 161,956 | 96,427 | **59.54%** |
| 6-10 logements | 123,934 | 70,705 | 57.05% |
| 2-5 logements | 719,617 | 349,722 | 48.60% |
| **1 logement** | 1,524,223 | 664,846 | **43.62%** |

**Impact**: x 1.36 (59.5% / 43.6%)

**Interprétation**:

- Les multi-propriétaires (+10 logements) ont un meilleur taux (60%)
- Plus le patrimoine est grand, plus le propriétaire est actif
- Hypothèse: gestion plus professionnelle, meilleure connaissance du marché

---

## 2. CARACTÉRISTIQUES DU LOGEMENT

### 2.1 `vacancy_duration_category` - Durée de vacance ✅

| Durée | N Total | N Sorties | Taux de sortie |
|-------|---------|-----------|----------------|
| **3-5 ans** | 678,465 | 468,372 | **69.03%** |
| 6-10 ans | 823,191 | 437,896 | 53.19% |
| **0-2 ans** | 1,028,074 | 275,432 | **26.79%** |

**Impact**: x 2.58 (69.0% / 26.8%)

**Interprétation**:

- **Peak à 3-5 ans**: La majorité des sorties se produisent après 3-5 ans
- **0-2 ans = 27%**: Ces logements viennent d'entrer en vacance, beaucoup n'ont pas encore eu le temps de sortir
- **6-10 ans = 53%**: Taux plus faible car les cas "faciles" sont déjà sortis

---

### 2.2 `vacancy_severity` - Sévérité de la vacance ✅

| Sévérité | N Total | N Sorties | Taux de sortie |
|----------|---------|-----------|----------------|
| **Modérée** (3-6 ans) | 906,369 | 619,219 | **68.32%** |
| Sévère (>6 ans) | 595,287 | 287,049 | 48.22% |
| **Légère** (0-2 ans) | 1,028,074 | 275,432 | **26.79%** |

**Impact**: x 2.55 (68.3% / 26.8%)

**Interprétation**:

- Le "sweet spot" pour l'intervention est la vacance **modérée (3-6 ans)**
- Assez longue pour être établie, pas trop pour être irréversible

---

### 2.3 `cadastral_classification_label` - Confort cadastral ✅

| Classification | N Total | N Sorties | Taux de sortie |
|----------------|---------|-----------|----------------|
| ⚠️ Inconnu | 13,095 | 12,191 | 93.10% |
| **Confortable** | 148,287 | 78,780 | **53.13%** |
| Assez confortable | 852,011 | 441,154 | 51.78% |
| Très confortable | 16,687 | 8,520 | 51.06% |
| Luxe | 1,559 | 740 | 47.47% |
| Ordinaire | 1,096,713 | 511,725 | 46.66% |
| Grand luxe | 141 | 60 | 42.55% |
| Médiocre | 315,179 | 103,494 | 32.84% |
| **Très médiocre** | 86,058 | 25,036 | **29.09%** |

**Impact (hors Inconnu)**: x 1.83 (53.1% / 29.1%)

**Interprétation**:

- Les logements confortables sortent plus facilement (53%)
- Les logements médiocres/très médiocres restent vacants (29-33%)
- ⚠️ "Inconnu" (93%) = artefact de données, à exclure de l'analyse

---

### 2.4 `has_recent_mutation` - Mutation récente ✅

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Pas de mutation** | 2,130,483 | 1,109,623 | **52.08%** |
| **Mutation récente** | 399,247 | 72,077 | **18.05%** |

**Impact**: x 2.89 (52.1% / 18.1%)

**Interprétation**:

- Les logements avec mutation récente ont un taux PLUS BAS (18%)
- **Explication**: Une mutation récente = le logement vient de changer de main
- Le nouveau propriétaire n'a pas encore eu le temps d'agir
- Ne pas cibler les mutations récentes immédiatement

---

### 2.5 `is_taxed` - Taxation vacance ⚠️

**Analyse brute (avec données corrompues)**:

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| Non taxé (COALESCE) | 1,136,054 | 903,439 | **79.52%** |
| Taxé | 1,393,676 | 278,261 | **19.97%** |

**⚠️ PROBLÈME**: Le champ `is_taxed = COALESCE(taxed, FALSE)` mélange:

| Composant | N Total | N Sorties | Taux |
|-----------|---------|-----------|------|
| taxed = FALSE (vrai "Non taxé") | 493,688 | 261,073 | **52.88%** |
| taxed IS NULL (artefact) | 642,366 | 642,366 | **100%** |
| taxed = TRUE (vrai "Taxé") | 1,393,676 | 278,261 | **19.97%** |

**Analyse corrigée (excluant NULL)**:

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Non taxé** | 493,688 | 261,073 | **52.88%** |
| **Taxé** | 1,393,676 | 278,261 | **19.97%** |

**Impact corrigé**: x 2.65 (52.9% / 20.0%)

**Interprétation**:

- Les logements **NON taxés** sortent plus (52.9%) que les **taxés** (20%)
- **Explication**: Les zones TLV sont des zones TENDUES où:
  - La demande est forte, donc la vacance normale sort naturellement
  - Les logements qui RESTENT vacants malgré la taxe ont des blocages structurels
  - Ce n'est pas un échec de la TLV, c'est un **biais de sélection territoriale**

---

### 2.6 `rental_value_category` - Valeur locative ⚠️

| Catégorie | N Total | N Sorties | Taux de sortie |
|-----------|---------|-----------|----------------|
| ⚠️ Inconnu | 253,414 | 253,414 | **100%** |
| **Très élevé (>3500€)** | 6,250 | 3,292 | **52.67%** |
| Élevé (2000-3500€) | 19,929 | 9,339 | 46.86% |
| Moyen (1000-2000€) | 136,066 | 59,902 | 44.02% |
| Faible (500-1000€) | 566,044 | 246,672 | 43.58% |
| **Très faible (<500€)** | 1,548,027 | 609,081 | **39.35%** |

**Impact (hors Inconnu)**: x 1.34 (52.7% / 39.4%)

**Interprétation**:

- Les logements à haute valeur locative sortent un peu plus (53% vs 39%)
- Gradient modéré: la valeur locative a un impact limité
- ⚠️ "Inconnu" (100%) = artefact de données

---

## 3. GÉOGRAPHIE

### 3.1 `densite_label_7` - Densité urbaine ✅

| Type de territoire | N Total | N Sorties | Taux de sortie |
|--------------------|---------|-----------|----------------|
| **Grands centres urbains** | 589,928 | 316,017 | **53.57%** |
| Centres urbains intermédiaires | 370,344 | 192,226 | 51.90% |
| Petites villes | 183,557 | 87,866 | 47.87% |
| Ceintures urbaines | 168,339 | 77,488 | 46.03% |
| Bourgs ruraux | 435,989 | 192,438 | 44.14% |
| Rural à habitat dispersé | 496,910 | 194,784 | 39.20% |
| **Rural à habitat très dispersé** | 159,797 | 56,793 | **35.54%** |

**Impact**: x 1.51 (53.6% / 35.5%)

**Interprétation**:

- Gradient clair **urbain → rural**
- Grands centres urbains: 54% vs Rural très dispersé: 36%
- La demande locative plus forte en ville facilite les sorties

---

### 3.2 `dvg_marche_dynamisme` - Dynamisme du marché ✅

| Dynamisme | N Total | N Sorties | Taux de sortie |
|-----------|---------|-----------|----------------|
| **Très dynamique** | 1,616,394 | 793,921 | **49.12%** |
| Dynamique | 368,964 | 144,452 | 39.15% |
| Modéré | 157,616 | 57,759 | 36.65% |
| **Faible** | 40,887 | 14,559 | **35.61%** |

**Impact**: x 1.38 (49.1% / 35.6%)

**Interprétation**:

- Plus le marché est actif, plus les logements sortent
- Marchés très dynamiques: 49% vs Marchés faibles: 36%

---

### 3.3 `action_coeur_de_ville` - Programme ACV ✅

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Action Cœur de Ville** | 387,310 | 207,996 | **53.70%** |
| Hors ACV | 2,142,420 | 973,704 | 45.45% |

**Impact**: x 1.18 (53.7% / 45.5%)

**Interprétation**:

- Les communes ACV ont un taux de sortie **+8 points** supérieur
- Les programmes territoriaux ciblés ont un effet positif mesurable

---

## 4. USAGE ZLV

### 4.1 `group_intensity` - Intensité de suivi ZLV ⚠️

| Intensité | N Total | N Sorties | Taux de sortie |
|-----------|---------|-----------|----------------|
| **Aucun groupe** | 1,664,049 | 918,406 | **55.19%** |
| 1 groupe | 516,006 | 164,918 | 31.96% |
| 2-3 groupes | 265,139 | 78,782 | 29.71% |
| **4+ groupes** | 84,536 | 19,594 | **23.18%** |

**Impact**: x 2.38 (55.2% / 23.2%)

**⚠️ BIAIS DE SÉLECTION**:

- **CONTRE-INTUITIF**: Les logements SANS groupe ont le meilleur taux!
- **Explication**: ZLV sélectionne les cas DIFFICILES pour les groupes
- Les logements "faciles" sortent naturellement sans intervention
- Plus un logement est dans de groupes, plus il est considéré comme "problématique"

---

### 4.2 `is_in_group` - Dans un groupe ZLV ⚠️

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Pas dans groupe** | 1,664,049 | 918,406 | **55.19%** |
| **Dans un groupe** | 865,681 | 263,294 | **30.41%** |

**Impact**: x 1.82 (55.2% / 30.4%)

**⚠️ Même biais de sélection** que group_intensity.

---

### 4.3 `was_exported_from_group` - Exporté depuis groupe ⚠️

| Statut | N Total | N Sorties | Taux de sortie |
|--------|---------|-----------|----------------|
| **Non exporté** | 1,732,487 | 943,924 | **54.48%** |
| **Exporté depuis groupe** | 797,243 | 237,776 | **29.82%** |

**Impact**: x 1.83 (54.5% / 29.8%)

**⚠️ Même biais de sélection**.

---

## 5. SYNTHÈSE

### Features fiables (pas de biais identifié)

| Feature | Impact | Action recommandée |
|---------|--------|-------------------|
| `owner_is_company` | x 3.68 | Approche différenciée pour sociétés |
| `vacancy_duration_category` | x 2.58 | **Cibler 3-5 ans** (sweet spot) |
| `vacancy_severity` | x 2.55 | Cibler sévérité modérée |
| `has_recent_mutation` | x 2.89 | Ne pas cibler mutations récentes |
| `cadastral_classification` | x 1.83 | Identifier besoins de travaux |
| `owner_location` | x 1.66 | Prioriser propriétaires locaux |
| `densite_label_7` | x 1.51 | Attentes réalistes en rural |
| `owner_portfolio_category` | x 1.36 | Cibler multi-propriétaires |
| `action_coeur_de_ville` | x 1.18 | Renforcer programmes ACV |

### Features avec biais à interpréter avec précaution

| Feature | Problème | Recommandation |
|---------|----------|----------------|
| `owner_age_category` | "Inconnu" = 14% (artefact) | Exclure "Inconnu" des analyses |
| `is_taxed` | "Inconnu" = 100% (artefact) | Analyse croisée nécessaire |
| `group_intensity` | Biais de sélection ZLV | Ne pas comparer brut |
| `owner_has_phone` | Échantillon très biaisé (0.18%) | Ne pas généraliser |
| `rental_value_category` | "Inconnu" = 100% (artefact) | Exclure "Inconnu" |

---

## Méthodologie - Rappel

Pour chaque feature:

1. **N Total**: Nombre de logements dans la catégorie
2. **N Sorties**: Nombre de logements sortis de vacance
3. **Taux de sortie**: N_Sorties / N_Total × 100
4. **Impact**: Taux_max / Taux_min (entre catégories valides)

**Taux global de référence**: 46.71% (1,181,700 / 2,529,730)
