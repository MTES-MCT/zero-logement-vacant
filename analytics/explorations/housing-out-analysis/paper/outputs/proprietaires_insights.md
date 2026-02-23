# Proprietaires - Analyse des features

*Analyse generee automatiquement*

---

## Statistiques globales

- **Total logements**: 2,529,730
- **Sorties de vacance**: 1,181,700
- **Taux de sortie global**: 46.71%

---

## Top facteurs par impact

| Rang | Feature | Impact (max/min) | Taux max | Taux min |
|------|---------|------------------|----------|----------|
| 1 | owner_age_category | x 5.03 | 69.7% (Moins de 40 ans) | 13.8% (Age inconnu) |
| 2 | owner_generation | x 4.94 | 68.4% (Millennial) | 13.8% (Inconnu) |
| 3 | owner_is_company | x 3.68 | 53.3% (Non societe) | 14.5% (Societe) |
| 4 | owner_has_phone | x 1.70 | 79.4% (A un telephone) | 46.6% (Sans telephone) |
| 5 | owner_has_email | x 1.68 | 78.5% (A un email) | 46.7% (Sans email) |

---

## Detail par feature

### owner_age_category

*Type: categorical | Impact: x 5.03*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moins de 40 ans | 96,925 | 69.7% | x 1.49 |
| 40-59 ans | 403,074 | 62.0% | x 1.33 |
| 60-74 ans | 435,352 | 56.7% | x 1.21 |
| 75 ans et plus | 452,468 | 55.2% | x 1.18 |
| Non applicable (PM) | 669,167 | 45.1% | x 0.97 |
| Age inconnu | 472,744 | 13.8% | x 0.30 |


### owner_generation

*Type: categorical | Impact: x 4.94*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Millennial | 162,551 | 68.4% | x 1.46 |
| Generation Z | 9,264 | 66.0% | x 1.41 |
| Generation X | 360,598 | 60.7% | x 1.30 |
| Baby Boomer | 544,537 | 56.1% | x 1.20 |
| Silent Generation | 310,869 | 55.6% | x 1.19 |
| Non applicable | 669,167 | 45.1% | x 0.97 |
| Inconnu | 472,744 | 13.8% | x 0.30 |


### owner_is_company

*Type: boolean | Impact: x 3.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non societe | 2,100,264 | 53.3% | x 1.14 |
| Societe | 429,466 | 14.5% | x 0.31 |


### owner_has_phone

*Type: boolean | Impact: x 1.70*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un telephone | 4,700 | 79.4% | x 1.70 |
| Sans telephone | 2,525,030 | 46.6% | x 1.00 |


### owner_has_email

*Type: boolean | Impact: x 1.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un email | 3,201 | 78.5% | x 1.68 |
| Sans email | 2,526,529 | 46.7% | x 1.00 |


### owner_contactable

*Type: boolean | Impact: x 1.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Contactable | 5,396 | 78.5% | x 1.68 |
| Non contactable | 2,524,334 | 46.6% | x 1.00 |


### owner_location_relative_label

*Type: categorical | Impact: x 1.66*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Meme departement | 648,366 | 63.9% | x 1.37 |
| Autre region | 214,365 | 51.4% | x 1.10 |
| Inconnu | 821,959 | 40.3% | x 0.86 |
| Meme region | 845,040 | 38.5% | x 0.83 |


### owner_distance_category

*Type: categorical | Impact: x 1.62*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 157,976 | 71.7% | x 1.53 |
| 5-20 km | 416,707 | 46.8% | x 1.00 |
| Plus de 100 km | 420,813 | 45.6% | x 0.98 |
| 20-50 km | 218,943 | 45.4% | x 0.97 |
| 50-100 km | 124,882 | 44.9% | x 0.96 |
| Moins de 5 km | 1,190,409 | 44.2% | x 0.95 |


### owner_is_local

*Type: boolean | Impact: x 1.57*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire local | 648,366 | 63.9% | x 1.37 |
| Proprietaire non local | 1,881,364 | 40.8% | x 0.87 |


### owner_housing_count

*Type: continuous | Impact: x 1.44*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 252,973 | 42.2% | x 0.90 |
| Q2: 1-1 | 252,973 | 44.8% | x 0.96 |
| Q3: 1-1 | 252,973 | 40.8% | x 0.87 |
| Q4: 1-1 | 252,973 | 44.8% | x 0.96 |
| Q5: 1-1 | 252,973 | 43.2% | x 0.92 |
| Q6: 1-1 | 252,973 | 46.5% | x 0.99 |
| Q7: 1-2 | 252,973 | 45.4% | x 0.97 |
| Q8: 2-3 | 252,973 | 48.1% | x 1.03 |
| Q9: 3-6 | 252,973 | 52.6% | x 1.13 |
| Q10: 6-15269 | 252,973 | 58.8% | x 1.26 |


### owner_portfolio_category

*Type: categorical | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Plus de 10 logements | 161,956 | 59.5% | x 1.27 |
| 6-10 logements | 123,933 | 57.0% | x 1.22 |
| 2-5 logements | 719,605 | 48.6% | x 1.04 |
| 1 logement | 1,524,236 | 43.6% | x 0.93 |


### owner_age

*Type: continuous | Impact: x 1.26*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -43-43 | 140,725 | 69.1% | x 1.48 |
| Q2: 43-50 | 140,725 | 64.1% | x 1.37 |
| Q3: 50-56 | 140,725 | 61.2% | x 1.31 |
| Q4: 56-61 | 140,725 | 58.2% | x 1.25 |
| Q5: 61-66 | 140,725 | 57.6% | x 1.23 |
| Q6: 66-71 | 140,725 | 57.5% | x 1.23 |
| Q7: 71-76 | 140,725 | 56.1% | x 1.20 |
| Q8: 76-82 | 140,725 | 54.7% | x 1.17 |
| Q9: 82-91 | 140,725 | 55.7% | x 1.19 |
| Q10: 91-2025 | 140,724 | 58.0% | x 1.24 |


### owner_is_multi_owner

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Multi-proprietaire | 1,005,494 | 51.4% | x 1.10 |
| Mono-proprietaire | 1,524,236 | 43.6% | x 0.93 |


### owner_is_sci

*Type: boolean | Impact: x 1.16*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non SCI | 2,087,885 | 47.9% | x 1.02 |
| SCI | 441,845 | 41.3% | x 0.88 |


### owner_is_individual

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non particulier | 745,721 | 50.6% | x 1.08 |
| Particulier | 1,784,009 | 45.1% | x 0.97 |


### owner_distance_km

*Type: continuous | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 237,176 | 44.3% | x 0.95 |
| Q2: 0-0 | 237,176 | 44.3% | x 0.95 |
| Q3: 0-1 | 237,176 | 41.8% | x 0.89 |
| Q4: 1-2 | 237,176 | 45.1% | x 0.96 |
| Q5: 2-5 | 237,175 | 45.5% | x 0.97 |
| Q6: 5-11 | 237,175 | 46.9% | x 1.00 |
| Q7: 11-24 | 237,175 | 46.5% | x 1.00 |
| Q8: 24-72 | 237,175 | 45.0% | x 0.96 |
| Q9: 72-291 | 237,175 | 44.9% | x 0.96 |
| Q10: 291-17411 | 237,175 | 46.3% | x 0.99 |


### owner_is_distant

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire distant | 214,365 | 51.4% | x 1.10 |
| Proprietaire proche | 2,315,365 | 46.3% | x 0.99 |


### owner_is_indivision

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non indivision | 2,529,730 | 46.7% | x 1.00 |


### owner_is_full_owner

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Demembrement | 2,529,730 | 46.7% | x 1.00 |


### property_right

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| autre | 4,686 | 0.0% | x 0.00 |
| usufruitier | 55,658 | 0.0% | x 0.00 |
| nu-proprietaire | 42,833 | 0.0% | x 0.00 |
| administrateur | 3,467 | 0.0% | x 0.00 |
| proprietaire-entier | 1,239,574 | 0.0% | x 0.00 |


### property_right_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 1,183,353 | 99.9% | x 2.14 |
| Demembrement | 98,491 | 0.0% | x 0.00 |
| Autre | 1,247,886 | 0.0% | x 0.00 |

