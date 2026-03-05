# Proprietaires - Stratifie par Action Coeur de Ville

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
| 1 | owner_age_category | categorical | x 3.79 | 77.7% (Moins de 40 ans) | 20.5% (Age inconnu) |
| 2 | owner_generation | categorical | x 3.70 | 75.9% (Millennial) | 20.5% (Inconnu) |
| 3 | owner_is_company | boolean | x 3.24 | 62.4% (Non societe) | 19.2% (Societe) |
| 4 | owner_distance_category | categorical | x 1.74 | 86.1% (Inconnu) | 49.6% (Plus de 100 km) |
| 5 | owner_has_phone | boolean | x 1.55 | 83.2% (A un telephone) | 53.6% (Sans telephone) |

### Detail par feature

#### owner_age_category

*Type: categorical | Impact: x 3.79*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moins de 40 ans | 17,535 | 77.7% | x 1.66 | x 1.45 |
| 40-59 ans | 63,963 | 69.7% | x 1.49 | x 1.30 |
| 60-74 ans | 58,294 | 63.8% | x 1.36 | x 1.19 |
| 75 ans et plus | 60,861 | 59.2% | x 1.27 | x 1.10 |
| Non applicable (PM) | 127,238 | 50.6% | x 1.08 | x 0.94 |
| Age inconnu | 59,419 | 20.5% | x 0.44 | x 0.38 |


#### owner_generation

*Type: categorical | Impact: x 3.70*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Millennial | 29,116 | 75.9% | x 1.62 | x 1.41 |
| Generation Z | 1,541 | 74.6% | x 1.60 | x 1.39 |
| Generation X | 55,558 | 68.2% | x 1.46 | x 1.27 |
| Baby Boomer | 72,185 | 62.8% | x 1.35 | x 1.17 |
| Silent Generation | 42,253 | 58.9% | x 1.26 | x 1.10 |
| Non applicable | 127,238 | 50.6% | x 1.08 | x 0.94 |
| Inconnu | 59,419 | 20.5% | x 0.44 | x 0.38 |


#### owner_is_company

*Type: boolean | Impact: x 3.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non societe | 309,546 | 62.4% | x 1.33 | x 1.16 |
| Societe | 77,764 | 19.2% | x 0.41 | x 0.36 |


#### owner_distance_category

*Type: categorical | Impact: x 1.74*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 25,313 | 86.1% | x 1.84 | x 1.60 |
| 5-20 km | 61,125 | 54.9% | x 1.18 | x 1.02 |
| 50-100 km | 22,245 | 53.0% | x 1.13 | x 0.99 |
| 20-50 km | 35,937 | 52.6% | x 1.13 | x 0.98 |
| Moins de 5 km | 176,679 | 50.5% | x 1.08 | x 0.94 |
| Plus de 100 km | 66,011 | 49.6% | x 1.06 | x 0.92 |


#### owner_has_phone

*Type: boolean | Impact: x 1.55*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| A un telephone | 1,377 | 83.2% | x 1.78 | x 1.55 |
| Sans telephone | 385,933 | 53.6% | x 1.15 | x 1.00 |


#### owner_location_relative_label

*Type: categorical | Impact: x 1.54*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Meme departement | 99,494 | 69.5% | x 1.49 | x 1.29 |
| Autre region | 27,601 | 61.8% | x 1.32 | x 1.15 |
| Meme region | 126,189 | 48.5% | x 1.04 | x 0.90 |
| Inconnu | 134,026 | 45.2% | x 0.97 | x 0.84 |


#### owner_contactable

*Type: boolean | Impact: x 1.52*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Contactable | 1,605 | 81.4% | x 1.74 | x 1.52 |
| Non contactable | 385,705 | 53.6% | x 1.15 | x 1.00 |


#### owner_has_email

*Type: boolean | Impact: x 1.51*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| A un email | 964 | 80.8% | x 1.73 | x 1.50 |
| Sans email | 386,346 | 53.6% | x 1.15 | x 1.00 |


#### owner_is_local

*Type: boolean | Impact: x 1.44*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Proprietaire local | 99,494 | 69.5% | x 1.49 | x 1.29 |
| Proprietaire non local | 287,816 | 48.2% | x 1.03 | x 0.90 |


#### owner_housing_count

*Type: continuous | Impact: x 1.37*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 38,731 | 49.8% | x 1.07 | x 0.93 |
| Q2: 1-1 | 38,731 | 55.0% | x 1.18 | x 1.02 |
| Q3: 1-1 | 38,731 | 51.6% | x 1.11 | x 0.96 |
| Q4: 1-1 | 38,731 | 50.9% | x 1.09 | x 0.95 |
| Q5: 1-2 | 38,731 | 46.5% | x 1.00 | x 0.87 |
| Q6: 2-2 | 38,731 | 54.6% | x 1.17 | x 1.02 |
| Q7: 2-3 | 38,731 | 49.5% | x 1.06 | x 0.92 |
| Q8: 3-5 | 38,731 | 56.6% | x 1.21 | x 1.05 |
| Q9: 5-9 | 38,731 | 58.7% | x 1.26 | x 1.09 |
| Q10: 9-15269 | 38,731 | 63.8% | x 1.37 | x 1.19 |


#### owner_age

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-41 | 20,486 | 77.6% | x 1.66 | x 1.45 |
| Q2: 41-48 | 20,485 | 71.8% | x 1.54 | x 1.34 |
| Q3: 48-54 | 20,485 | 69.9% | x 1.50 | x 1.30 |
| Q4: 54-59 | 20,485 | 68.0% | x 1.46 | x 1.27 |
| Q5: 59-64 | 20,485 | 64.8% | x 1.39 | x 1.21 |
| Q6: 64-69 | 20,485 | 65.0% | x 1.39 | x 1.21 |
| Q7: 69-75 | 20,485 | 63.7% | x 1.36 | x 1.19 |
| Q8: 75-81 | 20,485 | 60.5% | x 1.30 | x 1.13 |
| Q9: 81-91 | 20,485 | 60.6% | x 1.30 | x 1.13 |
| Q10: 91-2025 | 20,485 | 60.0% | x 1.28 | x 1.12 |


#### owner_portfolio_category

*Type: categorical | Impact: x 1.26*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Plus de 10 logements | 35,097 | 64.0% | x 1.37 | x 1.19 |
| 6-10 logements | 30,695 | 60.0% | x 1.29 | x 1.12 |
| 2-5 logements | 130,610 | 53.9% | x 1.15 | x 1.00 |
| 1 logement | 190,908 | 50.7% | x 1.08 | x 0.94 |


#### owner_is_sci

*Type: boolean | Impact: x 1.21*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non SCI | 300,834 | 55.8% | x 1.20 | x 1.04 |
| SCI | 86,476 | 46.3% | x 0.99 | x 0.86 |


#### owner_is_distant

*Type: boolean | Impact: x 1.16*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Proprietaire distant | 27,601 | 61.8% | x 1.32 | x 1.15 |
| Proprietaire proche | 359,709 | 53.1% | x 1.14 | x 0.99 |


#### owner_distance_km

*Type: continuous | Impact: x 1.15*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 36,200 | 48.1% | x 1.03 | x 0.90 |
| Q2: 0-0 | 36,200 | 51.8% | x 1.11 | x 0.96 |
| Q3: 0-1 | 36,200 | 49.9% | x 1.07 | x 0.93 |
| Q4: 1-2 | 36,200 | 50.4% | x 1.08 | x 0.94 |
| Q5: 2-6 | 36,200 | 52.4% | x 1.12 | x 0.98 |
| Q6: 6-12 | 36,200 | 55.3% | x 1.18 | x 1.03 |
| Q7: 12-29 | 36,200 | 53.9% | x 1.15 | x 1.00 |
| Q8: 29-80 | 36,199 | 52.2% | x 1.12 | x 0.97 |
| Q9: 80-290 | 36,199 | 51.0% | x 1.09 | x 0.95 |
| Q10: 290-17385 | 36,199 | 49.4% | x 1.06 | x 0.92 |


#### owner_is_multi_owner

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Multi-proprietaire | 196,402 | 56.6% | x 1.21 | x 1.05 |
| Mono-proprietaire | 190,908 | 50.7% | x 1.08 | x 0.94 |


#### owner_is_individual

*Type: boolean | Impact: x 1.05*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non particulier | 141,263 | 55.4% | x 1.19 | x 1.03 |
| Particulier | 246,047 | 52.7% | x 1.13 | x 0.98 |


#### owner_is_indivision

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non indivision | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### owner_is_full_owner

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Demembrement | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### property_right

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| nu-proprietaire | 4,824 | 0.0% | x 0.00 | x 0.00 |
| proprietaire-entier | 167,378 | 0.0% | x 0.00 | x 0.00 |
| autre | 893 | 0.0% | x 0.00 | x 0.00 |
| administrateur | 337 | 0.0% | x 0.00 | x 0.00 |
| usufruitier | 5,639 | 0.0% | x 0.00 | x 0.00 |


#### property_right_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 208,225 | 99.9% | x 2.14 | x 1.86 |
| Demembrement | 10,463 | 0.0% | x 0.00 | x 0.00 |
| Autre | 168,622 | 0.0% | x 0.00 | x 0.00 |


---

## Strate: action_coeur_de_ville = Hors ACV

- **N**: 2,142,420
- **Taux de sortie strate**: 45.45%
- **Taux de sortie global**: 46.71%

### Top facteurs

| Rang | Feature | Type | Impact | Taux max | Taux min |
|------|---------|------|--------|----------|----------|
| 1 | owner_age_category | categorical | x 5.27 | 68.0% (Moins de 40 ans) | 12.9% (Age inconnu) |
| 2 | owner_generation | categorical | x 5.18 | 66.7% (Millennial) | 12.9% (Inconnu) |
| 3 | owner_is_company | boolean | x 3.85 | 51.7% (Non societe) | 13.4% (Societe) |
| 4 | owner_location_relative_label | categorical | x 1.71 | 62.9% (Meme departement) | 36.8% (Meme region) |
| 5 | owner_has_phone | boolean | x 1.71 | 77.6% (A un telephone) | 45.4% (Sans telephone) |

### Detail par feature

#### owner_age_category

*Type: categorical | Impact: x 5.27*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Moins de 40 ans | 78,799 | 68.0% | x 1.45 | x 1.50 |
| 40-59 ans | 338,573 | 60.6% | x 1.30 | x 1.33 |
| 60-74 ans | 376,984 | 55.7% | x 1.19 | x 1.22 |
| 75 ans et plus | 392,792 | 54.6% | x 1.17 | x 1.20 |
| Non applicable (PM) | 541,930 | 43.8% | x 0.94 | x 0.96 |
| Age inconnu | 413,342 | 12.9% | x 0.28 | x 0.28 |


#### owner_generation

*Type: categorical | Impact: x 5.18*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Millennial | 133,434 | 66.7% | x 1.43 | x 1.47 |
| Generation Z | 7,723 | 64.3% | x 1.38 | x 1.41 |
| Generation X | 305,040 | 59.3% | x 1.27 | x 1.30 |
| Silent Generation | 268,607 | 55.1% | x 1.18 | x 1.21 |
| Baby Boomer | 472,344 | 55.0% | x 1.18 | x 1.21 |
| Non applicable | 541,930 | 43.8% | x 0.94 | x 0.96 |
| Inconnu | 413,342 | 12.9% | x 0.28 | x 0.28 |


#### owner_is_company

*Type: boolean | Impact: x 3.85*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non societe | 1,790,717 | 51.7% | x 1.11 | x 1.14 |
| Societe | 351,703 | 13.4% | x 0.29 | x 0.30 |


#### owner_location_relative_label

*Type: categorical | Impact: x 1.71*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Meme departement | 548,869 | 62.9% | x 1.35 | x 1.38 |
| Autre region | 186,763 | 49.8% | x 1.07 | x 1.10 |
| Inconnu | 687,944 | 39.4% | x 0.84 | x 0.87 |
| Meme region | 718,844 | 36.8% | x 0.79 | x 0.81 |


#### owner_has_phone

*Type: boolean | Impact: x 1.71*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| A un telephone | 3,332 | 77.6% | x 1.66 | x 1.71 |
| Sans telephone | 2,139,088 | 45.4% | x 0.97 | x 1.00 |


#### owner_has_email

*Type: boolean | Impact: x 1.70*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| A un email | 2,251 | 77.0% | x 1.65 | x 1.69 |
| Sans email | 2,140,169 | 45.4% | x 0.97 | x 1.00 |


#### owner_contactable

*Type: boolean | Impact: x 1.70*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Contactable | 3,805 | 77.0% | x 1.65 | x 1.69 |
| Non contactable | 2,138,615 | 45.4% | x 0.97 | x 1.00 |


#### owner_distance_category

*Type: categorical | Impact: x 1.60*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 132,690 | 68.9% | x 1.47 | x 1.52 |
| 5-20 km | 355,577 | 45.4% | x 0.97 | x 1.00 |
| Plus de 100 km | 354,790 | 44.9% | x 0.96 | x 0.99 |
| 20-50 km | 183,005 | 43.9% | x 0.94 | x 0.97 |
| Moins de 5 km | 1,013,722 | 43.1% | x 0.92 | x 0.95 |
| 50-100 km | 102,636 | 43.1% | x 0.92 | x 0.95 |


#### owner_is_local

*Type: boolean | Impact: x 1.59*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Proprietaire local | 548,869 | 62.9% | x 1.35 | x 1.38 |
| Proprietaire non local | 1,593,551 | 39.4% | x 0.84 | x 0.87 |


#### owner_housing_count

*Type: continuous | Impact: x 1.39*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 1-1 | 214,242 | 41.3% | x 0.88 | x 0.91 |
| Q2: 1-1 | 214,242 | 42.8% | x 0.92 | x 0.94 |
| Q3: 1-1 | 214,242 | 42.5% | x 0.91 | x 0.94 |
| Q4: 1-1 | 214,242 | 42.0% | x 0.90 | x 0.92 |
| Q5: 1-1 | 214,242 | 43.7% | x 0.93 | x 0.96 |
| Q6: 1-1 | 214,242 | 41.7% | x 0.89 | x 0.92 |
| Q7: 1-2 | 214,242 | 46.7% | x 1.00 | x 1.03 |
| Q8: 2-3 | 214,242 | 45.6% | x 0.98 | x 1.00 |
| Q9: 3-6 | 214,242 | 50.8% | x 1.09 | x 1.12 |
| Q10: 6-15269 | 214,242 | 57.5% | x 1.23 | x 1.26 |


#### owner_portfolio_category

*Type: categorical | Impact: x 1.37*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Plus de 10 logements | 126,860 | 58.3% | x 1.25 | x 1.28 |
| 6-10 logements | 93,231 | 56.1% | x 1.20 | x 1.23 |
| 2-5 logements | 588,995 | 47.4% | x 1.02 | x 1.04 |
| 1 logement | 1,333,334 | 42.6% | x 0.91 | x 0.94 |


#### owner_age

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: -43-43 | 120,238 | 67.4% | x 1.44 | x 1.48 |
| Q2: 43-51 | 120,238 | 62.4% | x 1.33 | x 1.37 |
| Q3: 51-57 | 120,238 | 59.5% | x 1.27 | x 1.31 |
| Q4: 57-62 | 120,238 | 57.0% | x 1.22 | x 1.25 |
| Q5: 62-66 | 120,238 | 56.6% | x 1.21 | x 1.24 |
| Q6: 66-71 | 120,238 | 56.2% | x 1.20 | x 1.24 |
| Q7: 71-76 | 120,238 | 55.1% | x 1.18 | x 1.21 |
| Q8: 76-82 | 120,238 | 53.7% | x 1.15 | x 1.18 |
| Q9: 82-91 | 120,238 | 55.0% | x 1.18 | x 1.21 |
| Q10: 91-2025 | 120,238 | 57.7% | x 1.24 | x 1.27 |


#### owner_is_multi_owner

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Multi-proprietaire | 809,086 | 50.1% | x 1.07 | x 1.10 |
| Mono-proprietaire | 1,333,334 | 42.6% | x 0.91 | x 0.94 |


#### owner_is_sci

*Type: boolean | Impact: x 1.16*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non SCI | 1,787,051 | 46.5% | x 1.00 | x 1.02 |
| SCI | 355,369 | 40.0% | x 0.86 | x 0.88 |


#### owner_is_individual

*Type: boolean | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non particulier | 604,481 | 49.5% | x 1.06 | x 1.09 |
| Particulier | 1,537,939 | 43.9% | x 0.94 | x 0.97 |


#### owner_distance_km

*Type: continuous | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 200,973 | 44.2% | x 0.95 | x 0.97 |
| Q2: 0-0 | 200,973 | 43.0% | x 0.92 | x 0.95 |
| Q3: 0-0 | 200,973 | 40.4% | x 0.86 | x 0.89 |
| Q4: 0-2 | 200,973 | 43.7% | x 0.94 | x 0.96 |
| Q5: 2-5 | 200,973 | 44.2% | x 0.95 | x 0.97 |
| Q6: 5-10 | 200,973 | 45.4% | x 0.97 | x 1.00 |
| Q7: 10-24 | 200,973 | 45.2% | x 0.97 | x 0.99 |
| Q8: 24-71 | 200,973 | 43.6% | x 0.93 | x 0.96 |
| Q9: 71-291 | 200,973 | 43.7% | x 0.94 | x 0.96 |
| Q10: 291-17411 | 200,973 | 45.7% | x 0.98 | x 1.01 |


#### owner_is_distant

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Proprietaire distant | 186,763 | 49.8% | x 1.07 | x 1.10 |
| Proprietaire proche | 1,955,657 | 45.0% | x 0.96 | x 0.99 |


#### owner_is_indivision

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Non indivision | 2,142,420 | 45.5% | x 0.97 | x 1.00 |


#### owner_is_full_owner

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Demembrement | 2,142,420 | 45.5% | x 0.97 | x 1.00 |


#### property_right

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| autre | 3,793 | 0.0% | x 0.00 | x 0.00 |
| nu-proprietaire | 38,009 | 0.0% | x 0.00 | x 0.00 |
| administrateur | 3,131 | 0.0% | x 0.00 | x 0.00 |
| usufruitier | 50,019 | 0.0% | x 0.00 | x 0.00 |
| syndic | 129 | 0.0% | x 0.00 | x 0.00 |
| proprietaire-entier | 1,072,177 | 0.0% | x 0.00 | x 0.00 |


#### property_right_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Inconnu | 975,146 | 99.8% | x 2.14 | x 2.20 |
| Demembrement | 88,028 | 0.0% | x 0.00 | x 0.00 |
| Autre | 1,079,246 | 0.0% | x 0.00 | x 0.00 |


---

## Notes methodologiques

- **Stratification**: Analyse par sous-population definie par action_coeur_de_ville
- **vs global**: Multiplicateur par rapport au taux de sortie global
- **vs strate**: Multiplicateur par rapport au taux de sortie de la strate
- **Seuil minimum**: Modalites avec < 100 observations exclues
