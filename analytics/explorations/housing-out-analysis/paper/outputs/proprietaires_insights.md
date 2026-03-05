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
| 4 | owner_has_phone | x 1.70 | 79.2% (A un telephone) | 46.6% (Sans telephone) |
| 5 | owner_contactable | x 1.68 | 78.3% (Contactable) | 46.6% (Non contactable) |

---

## Detail par feature

### owner_age_category

*Type: categorical | Impact: x 5.03*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moins de 40 ans | 96,334 | 69.7% | x 1.49 |
| 40-59 ans | 402,536 | 62.0% | x 1.33 |
| 60-74 ans | 435,278 | 56.7% | x 1.21 |
| 75 ans et plus | 453,653 | 55.2% | x 1.18 |
| Non applicable (PM) | 669,168 | 45.1% | x 0.97 |
| Age inconnu | 472,761 | 13.8% | x 0.30 |


### owner_generation

*Type: categorical | Impact: x 4.94*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Millennial | 162,550 | 68.4% | x 1.46 |
| Generation Z | 9,264 | 66.0% | x 1.41 |
| Generation X | 360,598 | 60.7% | x 1.30 |
| Baby Boomer | 544,529 | 56.1% | x 1.20 |
| Silent Generation | 310,860 | 55.6% | x 1.19 |
| Non applicable | 669,168 | 45.1% | x 0.97 |
| Inconnu | 472,761 | 13.8% | x 0.30 |


### owner_is_company

*Type: boolean | Impact: x 3.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non societe | 2,100,263 | 53.3% | x 1.14 |
| Societe | 429,467 | 14.5% | x 0.31 |


### owner_has_phone

*Type: boolean | Impact: x 1.70*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un telephone | 4,709 | 79.2% | x 1.70 |
| Sans telephone | 2,525,021 | 46.6% | x 1.00 |


### owner_contactable

*Type: boolean | Impact: x 1.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Contactable | 5,410 | 78.3% | x 1.68 |
| Non contactable | 2,524,320 | 46.6% | x 1.00 |


### owner_has_email

*Type: boolean | Impact: x 1.67*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un email | 3,215 | 78.2% | x 1.67 |
| Sans email | 2,526,515 | 46.7% | x 1.00 |


### owner_location_relative_label

*Type: categorical | Impact: x 1.66*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Meme departement | 648,363 | 63.9% | x 1.37 |
| Autre region | 214,364 | 51.4% | x 1.10 |
| Inconnu | 821,970 | 40.3% | x 0.86 |
| Meme region | 845,033 | 38.5% | x 0.83 |


### owner_distance_category

*Type: categorical | Impact: x 1.62*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 158,003 | 71.7% | x 1.53 |
| 5-20 km | 416,702 | 46.8% | x 1.00 |
| Plus de 100 km | 420,801 | 45.6% | x 0.98 |
| 20-50 km | 218,942 | 45.4% | x 0.97 |
| 50-100 km | 124,881 | 44.9% | x 0.96 |
| Moins de 5 km | 1,190,401 | 44.2% | x 0.95 |


### owner_is_local

*Type: boolean | Impact: x 1.57*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire local | 648,363 | 63.9% | x 1.37 |
| Proprietaire non local | 1,881,367 | 40.8% | x 0.87 |


### owner_housing_count

*Type: continuous | Impact: x 1.48*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 252,973 | 47.4% | x 1.02 |
| Q2: 1-1 | 252,973 | 42.9% | x 0.92 |
| Q3: 1-1 | 252,973 | 44.9% | x 0.96 |
| Q4: 1-1 | 252,973 | 39.8% | x 0.85 |
| Q5: 1-1 | 252,973 | 43.0% | x 0.92 |
| Q6: 1-1 | 252,973 | 43.8% | x 0.94 |
| Q7: 1-2 | 252,973 | 46.6% | x 1.00 |
| Q8: 2-3 | 252,973 | 47.4% | x 1.01 |
| Q9: 3-6 | 252,973 | 52.5% | x 1.12 |
| Q10: 6-15269 | 252,973 | 58.9% | x 1.26 |


### owner_portfolio_category

*Type: categorical | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Plus de 10 logements | 161,957 | 59.5% | x 1.27 |
| 6-10 logements | 123,926 | 57.0% | x 1.22 |
| 2-5 logements | 719,605 | 48.6% | x 1.04 |
| 1 logement | 1,524,242 | 43.6% | x 0.93 |


### owner_age

*Type: continuous | Impact: x 1.26*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -43-43 | 140,724 | 69.2% | x 1.48 |
| Q2: 43-51 | 140,723 | 64.1% | x 1.37 |
| Q3: 51-56 | 140,723 | 61.2% | x 1.31 |
| Q4: 56-61 | 140,723 | 58.2% | x 1.25 |
| Q5: 61-66 | 140,723 | 57.6% | x 1.23 |
| Q6: 66-71 | 140,723 | 57.5% | x 1.23 |
| Q7: 71-76 | 140,723 | 56.1% | x 1.20 |
| Q8: 76-82 | 140,723 | 54.9% | x 1.17 |
| Q9: 82-91 | 140,723 | 55.6% | x 1.19 |
| Q10: 91-2025 | 140,723 | 58.1% | x 1.24 |


### owner_is_multi_owner

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Multi-proprietaire | 1,005,488 | 51.4% | x 1.10 |
| Mono-proprietaire | 1,524,242 | 43.6% | x 0.93 |


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
| Non particulier | 745,744 | 50.6% | x 1.08 |
| Particulier | 1,783,986 | 45.1% | x 0.97 |


### owner_distance_km

*Type: continuous | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 237,173 | 43.5% | x 0.93 |
| Q2: 0-0 | 237,173 | 45.1% | x 0.97 |
| Q3: 0-1 | 237,173 | 41.8% | x 0.89 |
| Q4: 1-2 | 237,173 | 45.1% | x 0.96 |
| Q5: 2-5 | 237,173 | 45.5% | x 0.97 |
| Q6: 5-11 | 237,173 | 46.9% | x 1.00 |
| Q7: 11-24 | 237,173 | 46.5% | x 1.00 |
| Q8: 24-72 | 237,172 | 45.0% | x 0.96 |
| Q9: 72-291 | 237,172 | 44.9% | x 0.96 |
| Q10: 291-17411 | 237,172 | 46.3% | x 0.99 |


### owner_is_distant

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire distant | 214,364 | 51.4% | x 1.10 |
| Proprietaire proche | 2,315,366 | 46.3% | x 0.99 |


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
| usufruitier | 55,658 | 0.0% | x 0.00 |
| autre | 4,686 | 0.0% | x 0.00 |
| nu-proprietaire | 42,833 | 0.0% | x 0.00 |
| administrateur | 3,468 | 0.0% | x 0.00 |
| proprietaire-entier | 1,239,555 | 0.0% | x 0.00 |


### property_right_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 1,183,371 | 99.9% | x 2.14 |
| Demembrement | 98,491 | 0.0% | x 0.00 |
| Autre | 1,247,868 | 0.0% | x 0.00 |

