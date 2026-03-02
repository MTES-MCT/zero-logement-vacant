# Caracteristiques - Stratifie par Action Coeur de Ville

*Analyse stratifiee par **action_coeur_de_ville***

---

## Statistiques globales

- **Total logements**: 2,529,730
- **Taux de sortie global**: 46.71%
- **Variable de stratification**: action_coeur_de_ville
- **Nombre de strates**: 2

## Taux de sortie par strate

| Strate | N | N sortis | Taux sortie |
|--------|---|----------|-------------|
| ACV | 387,310 | 207,996 | 53.70% |
| Hors ACV | 2,142,420 | 973,704 | 45.45% |

---

## Strate: action_coeur_de_ville = ACV

- **N**: 387,310
- **Taux de sortie strate**: 53.70%
- **Taux de sortie global**: 46.71%

### Top facteurs

| Rang | Feature | Type | Impact | Taux max | Taux min |
|------|---------|------|--------|----------|----------|
| 1 | vacancy_severity | categorical | x 3.41 | 71.0% (Moderee) | 20.8% (Legere) |
| 2 | vacancy_duration_category | categorical | x 3.39 | 70.6% (3-5 ans) | 20.8% (0-2 ans) |
| 3 | is_taxed | boolean | x 3.06 | 82.7% (Non taxe) | 27.0% (Taxe vacance) |
| 4 | has_recent_mutation | boolean | x 3.05 | 59.3% (Pas de mutation recente) | 19.5% (Mutation recente) |
| 5 | condominium | categorical | x 2.92 | 100.0% (single) | 34.2% (TF) |

### Detail par feature

#### vacancy_severity

*Type: categorical | Impact: x 3.41*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moderee | 178,087 | 71.0% | x 1.52 | x 1.32 |
| Severe | 97,812 | 59.7% | x 1.28 | x 1.11 |
| Legere | 111,411 | 20.8% | x 0.45 | x 0.39 |


#### vacancy_duration_category

*Type: categorical | Impact: x 3.39*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 3-5 ans | 121,210 | 70.6% | x 1.51 | x 1.31 |
| 6-10 ans | 154,689 | 64.2% | x 1.37 | x 1.19 |
| 0-2 ans | 111,411 | 20.8% | x 0.45 | x 0.39 |


#### is_taxed

*Type: boolean | Impact: x 3.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non taxe | 185,656 | 82.7% | x 1.77 | x 1.54 |
| Taxe vacance | 201,654 | 27.0% | x 0.58 | x 0.50 |


#### has_recent_mutation

*Type: boolean | Impact: x 3.05*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Pas de mutation recente | 332,561 | 59.3% | x 1.27 | x 1.10 |
| Mutation recente | 54,749 | 19.5% | x 0.42 | x 0.36 |


#### condominium

*Type: categorical | Impact: x 2.92*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| single | 26,592 | 100.0% | x 2.14 | x 1.86 |
| co | 19,028 | 100.0% | x 2.14 | x 1.86 |
| other | 200 | 100.0% | x 2.14 | x 1.86 |
| CL | 131,443 | 52.4% | x 1.12 | x 0.98 |
| CV | 1,354 | 45.5% | x 0.97 | x 0.85 |
| CLV | 145 | 39.3% | x 0.84 | x 0.73 |
| TF | 552 | 34.2% | x 0.73 | x 0.64 |


#### cadastral_classification_label

*Type: categorical | Impact: x 2.40*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 2,628 | 94.3% | x 2.02 | x 1.76 |
| Confortable | 23,224 | 58.4% | x 1.25 | x 1.09 |
| Assez confortable | 149,750 | 56.5% | x 1.21 | x 1.05 |
| Tres confortable | 1,416 | 54.7% | x 1.17 | x 1.02 |
| Ordinaire | 173,466 | 52.9% | x 1.13 | x 0.99 |
| Mediocre | 29,610 | 40.4% | x 0.86 | x 0.75 |
| Tres mediocre | 7,140 | 39.3% | x 0.84 | x 0.73 |


#### rental_value_category

*Type: categorical | Impact: x 2.15*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 50,768 | 100.0% | x 2.14 | x 1.86 |
| Tres eleve (>3500€) | 1,667 | 59.8% | x 1.28 | x 1.11 |
| Eleve (2000-3500€) | 3,273 | 51.2% | x 1.10 | x 0.95 |
| Moyen (1000-2000€) | 23,351 | 47.1% | x 1.01 | x 0.88 |
| Faible (500-1000€) | 102,232 | 46.6% | x 1.00 | x 0.87 |
| Tres faible (<500€) | 206,019 | 46.6% | x 1.00 | x 0.87 |


#### beneficiary_count

*Type: continuous | Impact: x 1.50*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1 | 27,966 | 59.5% | x 1.27 | x 1.11 |
| Q2: 1-1 | 27,966 | 60.8% | x 1.30 | x 1.13 |
| Q3: 1-1 | 27,966 | 56.6% | x 1.21 | x 1.05 |
| Q4: 1-1 | 27,966 | 62.8% | x 1.34 | x 1.17 |
| Q5: 1-1 | 27,966 | 41.9% | x 0.90 | x 0.78 |
| Q6: 1-1 | 27,966 | 60.2% | x 1.29 | x 1.12 |
| Q7: 1-2 | 27,966 | 57.0% | x 1.22 | x 1.06 |
| Q8: 2-2 | 27,966 | 62.8% | x 1.34 | x 1.17 |
| Q9: 2-2 | 27,966 | 58.6% | x 1.25 | x 1.09 |
| Q10: 2-6 | 27,966 | 58.4% | x 1.25 | x 1.09 |


#### cadastral_classification

*Type: categorical | Impact: x 1.49*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 4 | 23,224 | 58.4% | x 1.25 | x 1.09 |
| 5 | 149,750 | 56.5% | x 1.21 | x 1.05 |
| 3 | 1,416 | 54.7% | x 1.17 | x 1.02 |
| 6 | 173,466 | 52.9% | x 1.13 | x 0.99 |
| 7 | 29,610 | 40.4% | x 0.86 | x 0.75 |
| 8 | 7,140 | 39.3% | x 0.84 | x 0.73 |


#### cadastral_classification

*Type: continuous | Impact: x 1.44*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-5 | 38,469 | 57.4% | x 1.23 | x 1.07 |
| Q2: 5-5 | 38,469 | 57.7% | x 1.24 | x 1.07 |
| Q3: 5-5 | 38,468 | 56.3% | x 1.21 | x 1.05 |
| Q4: 5-5 | 38,468 | 53.7% | x 1.15 | x 1.00 |
| Q5: 5-6 | 38,468 | 57.0% | x 1.22 | x 1.06 |
| Q6: 6-6 | 38,468 | 50.4% | x 1.08 | x 0.94 |
| Q7: 6-6 | 38,468 | 57.7% | x 1.23 | x 1.07 |
| Q8: 6-6 | 38,468 | 48.2% | x 1.03 | x 0.90 |
| Q9: 6-6 | 38,468 | 55.7% | x 1.19 | x 1.04 |
| Q10: 6-8 | 38,468 | 40.1% | x 0.86 | x 0.75 |


#### data_years_count

*Type: continuous | Impact: x 1.42*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 38,731 | 63.9% | x 1.37 | x 1.19 |
| Q2: 1-1 | 38,731 | 53.9% | x 1.15 | x 1.00 |
| Q3: 1-1 | 38,731 | 55.5% | x 1.19 | x 1.03 |
| Q4: 1-1 | 38,731 | 57.2% | x 1.22 | x 1.06 |
| Q5: 1-1 | 38,731 | 45.1% | x 0.97 | x 0.84 |
| Q6: 1-2 | 38,731 | 59.5% | x 1.27 | x 1.11 |
| Q7: 2-2 | 38,731 | 56.1% | x 1.20 | x 1.04 |
| Q8: 2-2 | 38,731 | 52.5% | x 1.12 | x 0.98 |
| Q9: 2-2 | 38,731 | 46.5% | x 1.00 | x 0.87 |
| Q10: 2-4 | 38,731 | 47.0% | x 1.01 | x 0.88 |


#### is_uncomfortable

*Type: boolean | Impact: x 1.39*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Confortable | 321,143 | 56.4% | x 1.21 | x 1.05 |
| Inconfortable | 66,167 | 40.5% | x 0.87 | x 0.75 |


#### energy_consumption_category

*Type: categorical | Impact: x 1.35*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Performant (A-B) | 1,444 | 64.8% | x 1.39 | x 1.21 |
| Moyen (C-D) | 74,030 | 64.0% | x 1.37 | x 1.19 |
| Peu performant (E) | 44,288 | 62.6% | x 1.34 | x 1.17 |
| Passoire (F-G) | 25,617 | 60.1% | x 1.29 | x 1.12 |
| Inconnu | 241,931 | 48.2% | x 1.03 | x 0.90 |


#### housing_kind

*Type: categorical | Impact: x 1.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| APPART | 294,421 | 56.3% | x 1.21 | x 1.05 |
| MAISON | 92,889 | 45.4% | x 0.97 | x 0.84 |


#### rooms_count

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1 | 38,717 | 55.1% | x 1.18 | x 1.03 |
| Q2: 1-1 | 38,717 | 56.6% | x 1.21 | x 1.05 |
| Q3: 1-2 | 38,717 | 58.1% | x 1.24 | x 1.08 |
| Q4: 2-2 | 38,717 | 57.1% | x 1.22 | x 1.06 |
| Q5: 2-2 | 38,716 | 53.6% | x 1.15 | x 1.00 |
| Q6: 2-3 | 38,716 | 55.7% | x 1.19 | x 1.04 |
| Q7: 3-3 | 38,716 | 49.5% | x 1.06 | x 0.92 |
| Q8: 3-4 | 38,716 | 55.7% | x 1.19 | x 1.04 |
| Q9: 4-4 | 38,716 | 47.7% | x 1.02 | x 0.89 |
| Q10: 4-82 | 38,716 | 48.1% | x 1.03 | x 0.90 |


#### living_area

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-23 | 38,717 | 54.6% | x 1.17 | x 1.02 |
| Q2: 23-30 | 38,717 | 58.1% | x 1.24 | x 1.08 |
| Q3: 30-37 | 38,717 | 57.4% | x 1.23 | x 1.07 |
| Q4: 37-45 | 38,717 | 55.7% | x 1.19 | x 1.04 |
| Q5: 45-53 | 38,716 | 54.6% | x 1.17 | x 1.02 |
| Q6: 53-61 | 38,716 | 54.2% | x 1.16 | x 1.01 |
| Q7: 61-70 | 38,716 | 53.6% | x 1.15 | x 1.00 |
| Q8: 70-81 | 38,716 | 51.4% | x 1.10 | x 0.96 |
| Q9: 81-100 | 38,716 | 50.2% | x 1.08 | x 0.94 |
| Q10: 100-1640 | 38,716 | 47.5% | x 1.02 | x 0.88 |


#### rental_value

*Type: continuous | Impact: x 1.21*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-195 | 33,655 | 40.5% | x 0.87 | x 0.75 |
| Q2: 195-259 | 33,655 | 46.3% | x 0.99 | x 0.86 |
| Q3: 259-309 | 33,654 | 48.9% | x 1.05 | x 0.91 |
| Q4: 309-362 | 33,654 | 47.3% | x 1.01 | x 0.88 |
| Q5: 362-421 | 33,654 | 48.4% | x 1.04 | x 0.90 |
| Q6: 421-491 | 33,654 | 47.6% | x 1.02 | x 0.89 |
| Q7: 491-577 | 33,654 | 47.5% | x 1.02 | x 0.88 |
| Q8: 577-700 | 33,654 | 46.7% | x 1.00 | x 0.87 |
| Q9: 700-936 | 33,654 | 45.9% | x 0.98 | x 0.85 |
| Q10: 936-32501 | 33,654 | 48.0% | x 1.03 | x 0.89 |


#### building_year_category

*Type: categorical | Impact: x 1.14*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 2000-2009 | 24,317 | 58.6% | x 1.25 | x 1.09 |
| 2010 et apres | 23,574 | 56.9% | x 1.22 | x 1.06 |
| 1990-1999 | 23,121 | 55.7% | x 1.19 | x 1.04 |
| 1950-1969 | 60,448 | 55.2% | x 1.18 | x 1.03 |
| Inconnu | 13,706 | 55.2% | x 1.18 | x 1.03 |
| 1970-1989 | 49,428 | 55.2% | x 1.18 | x 1.03 |
| 1900-1949 | 80,075 | 51.7% | x 1.11 | x 0.96 |
| Avant 1900 | 112,641 | 51.4% | x 1.10 | x 0.96 |


#### building_year

*Type: continuous | Impact: x 1.14*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1800 | 37,472 | 53.0% | x 1.13 | x 0.99 |
| Q2: 1800-1860 | 37,472 | 51.3% | x 1.10 | x 0.96 |
| Q3: 1860-1896 | 37,472 | 51.2% | x 1.10 | x 0.95 |
| Q4: 1896-1910 | 37,472 | 52.5% | x 1.12 | x 0.98 |
| Q5: 1910-1939 | 37,472 | 51.1% | x 1.09 | x 0.95 |
| Q6: 1939-1961 | 37,472 | 53.9% | x 1.15 | x 1.00 |
| Q7: 1961-1972 | 37,472 | 56.2% | x 1.20 | x 1.05 |
| Q8: 1972-1987 | 37,471 | 55.1% | x 1.18 | x 1.03 |
| Q9: 1987-2005 | 37,471 | 55.4% | x 1.19 | x 1.03 |
| Q10: 2005-2024 | 37,471 | 58.2% | x 1.25 | x 1.08 |


#### building_age

*Type: continuous | Impact: x 1.14*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-20 | 37,361 | 58.2% | x 1.25 | x 1.08 |
| Q2: 20-38 | 37,361 | 55.4% | x 1.19 | x 1.03 |
| Q3: 38-53 | 37,361 | 55.1% | x 1.18 | x 1.03 |
| Q4: 53-64 | 37,361 | 56.2% | x 1.20 | x 1.05 |
| Q5: 64-86 | 37,360 | 54.0% | x 1.15 | x 1.00 |
| Q6: 86-115 | 37,360 | 51.1% | x 1.09 | x 0.95 |
| Q7: 115-127 | 37,360 | 52.4% | x 1.12 | x 0.98 |
| Q8: 127-165 | 37,360 | 51.3% | x 1.10 | x 0.95 |
| Q9: 165-225 | 37,360 | 51.2% | x 1.10 | x 0.95 |
| Q10: 225-825 | 37,360 | 51.7% | x 1.11 | x 0.96 |


#### building_age_category

*Type: categorical | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Recent (<20 ans) | 35,078 | 58.4% | x 1.25 | x 1.09 |
| Moderne (20-50 ans) | 64,964 | 55.4% | x 1.19 | x 1.03 |
| Inconnu | 13,706 | 55.2% | x 1.18 | x 1.03 |
| Ancien (50-100 ans) | 104,906 | 54.3% | x 1.16 | x 1.01 |
| Tres ancien (>100 ans) | 168,656 | 51.6% | x 1.10 | x 0.96 |


#### energy_consumption_bdnb

*Type: categorical | Impact: x 1.10*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| A | 311 | 65.3% | x 1.40 | x 1.22 |
| C | 20,814 | 65.0% | x 1.39 | x 1.21 |
| B | 1,133 | 64.7% | x 1.39 | x 1.20 |
| D | 53,216 | 63.7% | x 1.36 | x 1.19 |
| E | 44,288 | 62.6% | x 1.34 | x 1.17 |
| F | 16,288 | 60.5% | x 1.30 | x 1.13 |
| G | 9,329 | 59.3% | x 1.27 | x 1.10 |


#### is_energy_sieve

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non passoire | 119,762 | 63.5% | x 1.36 | x 1.18 |
| Passoire energetique | 25,617 | 60.1% | x 1.29 | x 1.12 |


#### housing_kind_label

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Autre | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### rooms_count_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 1 piece | 91,228 | 56.3% | x 1.21 | x 1.05 |
| 2 pieces | 103,590 | 55.9% | x 1.20 | x 1.04 |
| 3 pieces | 95,244 | 52.9% | x 1.13 | x 0.98 |
| 4 pieces | 59,723 | 51.0% | x 1.09 | x 0.95 |
| 5 pieces et plus | 37,379 | 47.8% | x 1.02 | x 0.89 |
| Inconnu | 146 | 0.0% | x 0.00 | x 0.00 |


#### living_area_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moins de 30m2 | 71,149 | 56.4% | x 1.21 | x 1.05 |
| 30-49m2 | 105,294 | 56.3% | x 1.20 | x 1.05 |
| 50-79m2 | 126,045 | 53.3% | x 1.14 | x 0.99 |
| 80-99m2 | 43,748 | 50.3% | x 1.08 | x 0.94 |
| 100-149m2 | 31,409 | 48.0% | x 1.03 | x 0.89 |
| 150m2 et plus | 9,519 | 45.6% | x 0.98 | x 0.85 |
| Inconnu | 146 | 0.0% | x 0.00 | x 0.00 |


#### surface_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Petit (<50m2) | 176,443 | 56.3% | x 1.21 | x 1.05 |
| Moyen (50-100m2) | 169,793 | 52.5% | x 1.12 | x 0.98 |
| Grand (>100m2) | 40,928 | 47.4% | x 1.02 | x 0.88 |
| Inconnu | 146 | 0.0% | x 0.00 | x 0.00 |


#### vacancy_status_label

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Sorti de vacance | 207,996 | 100.0% | x 2.14 | x 1.86 |
| Toujours vacant | 179,314 | 0.0% | x 0.00 | x 0.00 |


#### years_in_vacancy

*Type: continuous | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 38,731 | 0.0% | x 0.00 | x 0.00 |
| Q2: 1-2 | 38,731 | 14.9% | x 0.32 | x 0.28 |
| Q3: 2-3 | 38,731 | 53.1% | x 1.14 | x 0.99 |
| Q4: 3-4 | 38,731 | 65.1% | x 1.39 | x 1.21 |
| Q5: 4-4 | 38,731 | 72.5% | x 1.55 | x 1.35 |
| Q6: 4-5 | 38,731 | 74.6% | x 1.60 | x 1.39 |
| Q7: 5-7 | 38,731 | 71.2% | x 1.52 | x 1.33 |
| Q8: 7-7 | 38,731 | 63.4% | x 1.36 | x 1.18 |
| Q9: 7-7 | 38,731 | 62.0% | x 1.33 | x 1.15 |
| Q10: 7-7 | 38,731 | 60.0% | x 1.29 | x 1.12 |


---

## Strate: action_coeur_de_ville = Hors ACV

- **N**: 2,142,420
- **Taux de sortie strate**: 45.45%
- **Taux de sortie global**: 46.71%

### Top facteurs

| Rang | Feature | Type | Impact | Taux max | Taux min |
|------|---------|------|--------|----------|----------|
| 1 | is_taxed | boolean | x 4.20 | 78.9% (Non taxe) | 18.8% (Taxe vacance) |
| 2 | vacancy_severity | categorical | x 4.02 | 66.0% (Moderee) | 16.4% (Legere) |
| 3 | vacancy_duration_category | categorical | x 3.97 | 65.2% (3-5 ans) | 16.4% (0-2 ans) |
| 4 | cadastral_classification_label | categorical | x 3.29 | 92.8% (Inconnu) | 28.2% (Tres mediocre) |
| 5 | has_recent_mutation | boolean | x 3.10 | 50.7% (Pas de mutation recente) | 16.4% (Mutation recente) |

### Detail par feature

#### is_taxed

*Type: boolean | Impact: x 4.20*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non taxe | 950,398 | 78.9% | x 1.69 | x 1.74 |
| Taxe vacance | 1,192,022 | 18.8% | x 0.40 | x 0.41 |


#### vacancy_severity

*Type: categorical | Impact: x 4.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moderee | 848,077 | 66.0% | x 1.41 | x 1.45 |
| Severe | 611,786 | 49.3% | x 1.06 | x 1.08 |
| Legere | 682,557 | 16.4% | x 0.35 | x 0.36 |


#### vacancy_duration_category

*Type: categorical | Impact: x 3.97*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 3-5 ans | 602,174 | 65.2% | x 1.40 | x 1.43 |
| 6-10 ans | 857,689 | 54.7% | x 1.17 | x 1.20 |
| 0-2 ans | 682,557 | 16.4% | x 0.35 | x 0.36 |


#### cadastral_classification_label

*Type: categorical | Impact: x 3.29*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 10,467 | 92.8% | x 1.99 | x 2.04 |
| Confortable | 125,063 | 52.1% | x 1.12 | x 1.15 |
| Assez confortable | 702,261 | 50.8% | x 1.09 | x 1.12 |
| Tres confortable | 15,271 | 50.7% | x 1.09 | x 1.12 |
| Luxe | 1,485 | 47.6% | x 1.02 | x 1.05 |
| Ordinaire | 923,247 | 45.5% | x 0.97 | x 1.00 |
| Grand luxe | 139 | 43.2% | x 0.92 | x 0.95 |
| Mediocre | 285,569 | 32.1% | x 0.69 | x 0.71 |
| Tres mediocre | 78,918 | 28.2% | x 0.60 | x 0.62 |


#### has_recent_mutation

*Type: boolean | Impact: x 3.10*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Pas de mutation recente | 1,816,204 | 50.7% | x 1.08 | x 1.12 |
| Mutation recente | 326,216 | 16.4% | x 0.35 | x 0.36 |


#### condominium

*Type: categorical | Impact: x 2.77*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| co | 63,320 | 100.0% | x 2.14 | x 2.20 |
| other | 956 | 100.0% | x 2.14 | x 2.20 |
| single | 160,404 | 100.0% | x 2.14 | x 2.20 |
| CL | 490,547 | 47.7% | x 1.02 | x 1.05 |
| CLV | 564 | 43.1% | x 0.92 | x 0.95 |
| TF | 827 | 42.8% | x 0.92 | x 0.94 |
| CV | 9,399 | 41.0% | x 0.88 | x 0.90 |
| BND | 158 | 36.1% | x 0.77 | x 0.79 |


#### rental_value_category

*Type: categorical | Impact: x 2.62*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 202,646 | 100.0% | x 2.14 | x 2.20 |
| Tres eleve (>3500€) | 4,583 | 50.1% | x 1.07 | x 1.10 |
| Eleve (2000-3500€) | 16,656 | 46.0% | x 0.98 | x 1.01 |
| Moyen (1000-2000€) | 112,715 | 43.4% | x 0.93 | x 0.95 |
| Faible (500-1000€) | 463,812 | 42.9% | x 0.92 | x 0.94 |
| Tres faible (<500€) | 1,342,008 | 38.2% | x 0.82 | x 0.84 |


#### cadastral_classification

*Type: categorical | Impact: x 1.85*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 4 | 125,063 | 52.1% | x 1.12 | x 1.15 |
| 5 | 702,261 | 50.8% | x 1.09 | x 1.12 |
| 3 | 15,271 | 50.7% | x 1.09 | x 1.12 |
| 2 | 1,485 | 47.6% | x 1.02 | x 1.05 |
| 6 | 923,247 | 45.5% | x 0.97 | x 1.00 |
| 1 | 139 | 43.2% | x 0.92 | x 0.95 |
| 7 | 285,569 | 32.1% | x 0.69 | x 0.71 |
| 8 | 78,918 | 28.2% | x 0.60 | x 0.62 |


#### cadastral_classification

*Type: continuous | Impact: x 1.78*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-5 | 213,196 | 51.4% | x 1.10 | x 1.13 |
| Q2: 5-5 | 213,196 | 47.0% | x 1.01 | x 1.03 |
| Q3: 5-5 | 213,196 | 52.8% | x 1.13 | x 1.16 |
| Q4: 5-6 | 213,195 | 52.9% | x 1.13 | x 1.16 |
| Q5: 6-6 | 213,195 | 45.0% | x 0.96 | x 0.99 |
| Q6: 6-6 | 213,195 | 42.9% | x 0.92 | x 0.94 |
| Q7: 6-6 | 213,195 | 46.9% | x 1.00 | x 1.03 |
| Q8: 6-6 | 213,195 | 45.9% | x 0.98 | x 1.01 |
| Q9: 6-7 | 213,195 | 37.8% | x 0.81 | x 0.83 |
| Q10: 7-8 | 213,195 | 29.7% | x 0.64 | x 0.65 |


#### rental_value

*Type: continuous | Impact: x 1.57*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-122 | 193,978 | 27.6% | x 0.59 | x 0.61 |
| Q2: 122-188 | 193,978 | 33.6% | x 0.72 | x 0.74 |
| Q3: 188-244 | 193,978 | 38.6% | x 0.83 | x 0.85 |
| Q4: 244-297 | 193,978 | 40.6% | x 0.87 | x 0.89 |
| Q5: 297-355 | 193,977 | 42.3% | x 0.91 | x 0.93 |
| Q6: 355-422 | 193,977 | 42.5% | x 0.91 | x 0.94 |
| Q7: 422-508 | 193,977 | 42.9% | x 0.92 | x 0.94 |
| Q8: 508-632 | 193,977 | 43.0% | x 0.92 | x 0.95 |
| Q9: 632-861 | 193,977 | 42.9% | x 0.92 | x 0.94 |
| Q10: 861-33600 | 193,977 | 43.5% | x 0.93 | x 0.96 |


#### energy_consumption_category

*Type: categorical | Impact: x 1.54*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Performant (A-B) | 8,153 | 62.4% | x 1.34 | x 1.37 |
| Moyen (C-D) | 238,048 | 62.3% | x 1.33 | x 1.37 |
| Peu performant (E) | 159,059 | 59.7% | x 1.28 | x 1.31 |
| Passoire (F-G) | 133,269 | 56.5% | x 1.21 | x 1.24 |
| Inconnu | 1,603,891 | 40.5% | x 0.87 | x 0.89 |


#### is_uncomfortable

*Type: boolean | Impact: x 1.52*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Confortable | 1,566,981 | 50.0% | x 1.07 | x 1.10 |
| Inconfortable | 575,439 | 32.9% | x 0.71 | x 0.72 |


#### housing_kind

*Type: categorical | Impact: x 1.32*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| APPART | 1,025,691 | 52.0% | x 1.11 | x 1.14 |
| MAISON | 1,116,729 | 39.5% | x 0.84 | x 0.87 |


#### building_age

*Type: continuous | Impact: x 1.32*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-21 | 209,848 | 52.4% | x 1.12 | x 1.15 |
| Q2: 21-42 | 209,848 | 51.2% | x 1.10 | x 1.13 |
| Q3: 42-56 | 209,848 | 47.2% | x 1.01 | x 1.04 |
| Q4: 56-72 | 209,848 | 47.5% | x 1.02 | x 1.04 |
| Q5: 72-105 | 209,848 | 44.7% | x 0.96 | x 0.98 |
| Q6: 105-125 | 209,848 | 44.8% | x 0.96 | x 0.99 |
| Q7: 125-155 | 209,848 | 44.4% | x 0.95 | x 0.98 |
| Q8: 155-175 | 209,848 | 41.5% | x 0.89 | x 0.91 |
| Q9: 175-225 | 209,847 | 39.6% | x 0.85 | x 0.87 |
| Q10: 225-825 | 209,847 | 40.3% | x 0.86 | x 0.89 |


#### building_year_category

*Type: categorical | Impact: x 1.31*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 2000-2009 | 124,169 | 54.1% | x 1.16 | x 1.19 |
| 1990-1999 | 110,475 | 52.0% | x 1.11 | x 1.14 |
| 2010 et apres | 130,850 | 50.8% | x 1.09 | x 1.12 |
| Inconnu | 43,942 | 49.7% | x 1.06 | x 1.09 |
| 1970-1989 | 263,146 | 47.5% | x 1.02 | x 1.04 |
| 1950-1969 | 241,531 | 47.3% | x 1.01 | x 1.04 |
| 1900-1949 | 433,559 | 44.9% | x 0.96 | x 0.99 |
| Avant 1900 | 794,748 | 41.1% | x 0.88 | x 0.91 |


#### building_year

*Type: continuous | Impact: x 1.31*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1800 | 210,305 | 41.0% | x 0.88 | x 0.90 |
| Q2: 1800-1850 | 210,305 | 40.0% | x 0.86 | x 0.88 |
| Q3: 1850-1870 | 210,304 | 41.5% | x 0.89 | x 0.91 |
| Q4: 1870-1900 | 210,304 | 43.6% | x 0.93 | x 0.96 |
| Q5: 1900-1920 | 210,304 | 45.5% | x 0.97 | x 1.00 |
| Q6: 1920-1953 | 210,304 | 44.8% | x 0.96 | x 0.98 |
| Q7: 1953-1969 | 210,304 | 47.4% | x 1.02 | x 1.04 |
| Q8: 1969-1983 | 210,304 | 47.2% | x 1.01 | x 1.04 |
| Q9: 1983-2004 | 210,304 | 51.2% | x 1.10 | x 1.13 |
| Q10: 2004-2024 | 210,304 | 52.5% | x 1.12 | x 1.15 |


#### building_age_category

*Type: categorical | Impact: x 1.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Recent (<20 ans) | 188,679 | 52.3% | x 1.12 | x 1.15 |
| Moderne (20-50 ans) | 330,067 | 50.0% | x 1.07 | x 1.10 |
| Inconnu | 43,942 | 49.7% | x 1.06 | x 1.09 |
| Ancien (50-100 ans) | 480,023 | 46.7% | x 1.00 | x 1.03 |
| Tres ancien (>100 ans) | 1,099,709 | 42.2% | x 0.90 | x 0.93 |


#### beneficiary_count

*Type: continuous | Impact: x 1.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1 | 157,240 | 49.2% | x 1.05 | x 1.08 |
| Q2: 1-1 | 157,240 | 51.4% | x 1.10 | x 1.13 |
| Q3: 1-1 | 157,240 | 48.9% | x 1.05 | x 1.08 |
| Q4: 1-1 | 157,240 | 44.3% | x 0.95 | x 0.98 |
| Q5: 1-1 | 157,240 | 48.3% | x 1.03 | x 1.06 |
| Q6: 1-1 | 157,239 | 50.3% | x 1.08 | x 1.11 |
| Q7: 1-2 | 157,239 | 54.8% | x 1.17 | x 1.21 |
| Q8: 2-2 | 157,239 | 51.1% | x 1.09 | x 1.13 |
| Q9: 2-2 | 157,239 | 54.5% | x 1.17 | x 1.20 |
| Q10: 2-6 | 157,239 | 51.3% | x 1.10 | x 1.13 |


#### data_years_count

*Type: continuous | Impact: x 1.18*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 214,242 | 47.9% | x 1.02 | x 1.05 |
| Q2: 1-1 | 214,242 | 45.5% | x 0.97 | x 1.00 |
| Q3: 1-1 | 214,242 | 45.5% | x 0.97 | x 1.00 |
| Q4: 1-1 | 214,242 | 47.5% | x 1.02 | x 1.04 |
| Q5: 1-1 | 214,242 | 46.4% | x 0.99 | x 1.02 |
| Q6: 1-2 | 214,242 | 49.6% | x 1.06 | x 1.09 |
| Q7: 2-2 | 214,242 | 45.0% | x 0.96 | x 0.99 |
| Q8: 2-2 | 214,242 | 43.2% | x 0.92 | x 0.95 |
| Q9: 2-2 | 214,242 | 41.9% | x 0.90 | x 0.92 |
| Q10: 2-4 | 214,242 | 42.1% | x 0.90 | x 0.93 |


#### energy_consumption_bdnb

*Type: categorical | Impact: x 1.14*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| B | 6,026 | 63.4% | x 1.36 | x 1.40 |
| C | 71,852 | 63.2% | x 1.35 | x 1.39 |
| D | 166,196 | 62.0% | x 1.33 | x 1.36 |
| E | 159,059 | 59.7% | x 1.28 | x 1.31 |
| A | 2,127 | 59.5% | x 1.27 | x 1.31 |
| F | 77,530 | 57.1% | x 1.22 | x 1.26 |
| G | 55,739 | 55.8% | x 1.19 | x 1.23 |


#### living_area

*Type: continuous | Impact: x 1.14*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-25 | 214,168 | 48.4% | x 1.04 | x 1.06 |
| Q2: 25-34 | 214,168 | 48.9% | x 1.05 | x 1.08 |
| Q3: 34-43 | 214,168 | 46.7% | x 1.00 | x 1.03 |
| Q4: 43-52 | 214,168 | 45.9% | x 0.98 | x 1.01 |
| Q5: 52-60 | 214,168 | 44.9% | x 0.96 | x 0.99 |
| Q6: 60-70 | 214,168 | 46.0% | x 0.98 | x 1.01 |
| Q7: 70-80 | 214,168 | 44.2% | x 0.95 | x 0.97 |
| Q8: 80-96 | 214,168 | 44.1% | x 0.94 | x 0.97 |
| Q9: 96-120 | 214,168 | 42.8% | x 0.92 | x 0.94 |
| Q10: 120-300000 | 214,167 | 42.9% | x 0.92 | x 0.94 |


#### rooms_count

*Type: continuous | Impact: x 1.12*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-1 | 214,168 | 43.9% | x 0.94 | x 0.97 |
| Q2: 1-1 | 214,168 | 47.9% | x 1.02 | x 1.05 |
| Q3: 1-2 | 214,168 | 47.1% | x 1.01 | x 1.04 |
| Q4: 2-2 | 214,168 | 45.7% | x 0.98 | x 1.00 |
| Q5: 2-3 | 214,168 | 47.7% | x 1.02 | x 1.05 |
| Q6: 3-3 | 214,168 | 44.9% | x 0.96 | x 0.99 |
| Q7: 3-4 | 214,168 | 45.2% | x 0.97 | x 0.99 |
| Q8: 4-4 | 214,168 | 45.3% | x 0.97 | x 1.00 |
| Q9: 4-5 | 214,168 | 44.2% | x 0.95 | x 0.97 |
| Q10: 5-198 | 214,167 | 42.8% | x 0.92 | x 0.94 |


#### is_energy_sieve

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non passoire | 405,260 | 61.3% | x 1.31 | x 1.35 |
| Passoire energetique | 133,269 | 56.5% | x 1.21 | x 1.24 |


#### housing_kind_label

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Autre | 2,142,420 | 45.5% | x 0.97 | x 1.00 |


#### rooms_count_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| 2 pieces | 512,630 | 46.6% | x 1.00 | x 1.02 |
| 1 piece | 422,481 | 46.4% | x 0.99 | x 1.02 |
| 3 pieces | 537,605 | 45.5% | x 0.97 | x 1.00 |
| 4 pieces | 365,704 | 44.9% | x 0.96 | x 0.99 |
| 5 pieces et plus | 303,259 | 42.9% | x 0.92 | x 0.94 |
| Inconnu | 741 | 0.0% | x 0.00 | x 0.00 |


#### living_area_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moins de 30m2 | 304,978 | 48.8% | x 1.04 | x 1.07 |
| 30-49m2 | 479,805 | 47.1% | x 1.01 | x 1.04 |
| 50-79m2 | 664,602 | 45.2% | x 0.97 | x 0.99 |
| 80-99m2 | 301,424 | 43.6% | x 0.93 | x 0.96 |
| 150m2 et plus | 101,595 | 42.9% | x 0.92 | x 0.94 |
| 100-149m2 | 289,275 | 42.7% | x 0.91 | x 0.94 |
| Inconnu | 741 | 0.0% | x 0.00 | x 0.00 |


#### surface_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Petit (<50m2) | 784,783 | 47.8% | x 1.02 | x 1.05 |
| Moyen (50-100m2) | 966,026 | 44.7% | x 0.96 | x 0.98 |
| Grand (>100m2) | 390,870 | 42.8% | x 0.92 | x 0.94 |
| Inconnu | 741 | 0.0% | x 0.00 | x 0.00 |


#### vacancy_status_label

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Sorti de vacance | 973,704 | 100.0% | x 2.14 | x 2.20 |
| Toujours vacant | 1,168,716 | 0.0% | x 0.00 | x 0.00 |


#### years_in_vacancy

*Type: continuous | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 214,242 | 0.0% | x 0.00 | x 0.00 |
| Q2: 1-1 | 214,242 | 0.0% | x 0.00 | x 0.00 |
| Q3: 1-2 | 214,242 | 42.8% | x 0.92 | x 0.94 |
| Q4: 2-3 | 214,242 | 56.6% | x 1.21 | x 1.24 |
| Q5: 3-4 | 214,242 | 67.3% | x 1.44 | x 1.48 |
| Q6: 4-6 | 214,242 | 69.1% | x 1.48 | x 1.52 |
| Q7: 6-7 | 214,242 | 63.8% | x 1.37 | x 1.40 |
| Q8: 7-7 | 214,242 | 50.6% | x 1.08 | x 1.11 |
| Q9: 7-7 | 214,242 | 51.2% | x 1.10 | x 1.13 |
| Q10: 7-7 | 214,242 | 53.1% | x 1.14 | x 1.17 |


---

## Notes methodologiques

- **Stratification**: Analyse par sous-population definie par action_coeur_de_ville
- **vs global**: Multiplicateur par rapport au taux de sortie global
- **vs strate**: Multiplicateur par rapport au taux de sortie de la strate
- **Seuil minimum**: Modalites avec < 100 observations exclues
