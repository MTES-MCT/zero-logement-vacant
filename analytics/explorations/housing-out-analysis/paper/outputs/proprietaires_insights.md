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
| 4 | owner_has_phone | x 1.74 | 81.2% (A un telephone) | 46.6% (Sans telephone) |
| 5 | owner_has_email | x 1.72 | 80.4% (A un email) | 46.7% (Sans email) |

---

## Detail par feature

### owner_age_category

*Type: categorical | Impact: x 5.03*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moins de 40 ans | 97,949 | 69.7% | x 1.49 |
| 40-59 ans | 404,336 | 61.9% | x 1.33 |
| 60-74 ans | 435,302 | 56.7% | x 1.21 |
| 75 ans et plus | 450,205 | 55.2% | x 1.18 |
| Non applicable (PM) | 669,173 | 45.1% | x 0.97 |
| Age inconnu | 472,765 | 13.8% | x 0.30 |


### owner_generation

*Type: categorical | Impact: x 4.94*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Millennial | 162,539 | 68.4% | x 1.46 |
| Generation Z | 9,262 | 66.0% | x 1.41 |
| Generation X | 360,573 | 60.7% | x 1.30 |
| Baby Boomer | 544,533 | 56.1% | x 1.20 |
| Silent Generation | 310,885 | 55.6% | x 1.19 |
| Non applicable | 669,173 | 45.1% | x 0.97 |
| Inconnu | 472,765 | 13.8% | x 0.30 |


### owner_is_company

*Type: boolean | Impact: x 3.68*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non societe | 2,100,256 | 53.3% | x 1.14 |
| Societe | 429,474 | 14.5% | x 0.31 |


### owner_has_phone

*Type: boolean | Impact: x 1.74*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un telephone | 4,591 | 81.2% | x 1.74 |
| Sans telephone | 2,525,139 | 46.6% | x 1.00 |


### owner_has_email

*Type: boolean | Impact: x 1.72*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A un email | 3,121 | 80.4% | x 1.72 |
| Sans email | 2,526,609 | 46.7% | x 1.00 |


### owner_contactable

*Type: boolean | Impact: x 1.72*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Contactable | 5,271 | 80.3% | x 1.72 |
| Non contactable | 2,524,459 | 46.6% | x 1.00 |


### owner_location_relative_label

*Type: categorical | Impact: x 1.66*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Meme departement | 648,385 | 63.9% | x 1.37 |
| Autre region | 214,367 | 51.4% | x 1.10 |
| Inconnu | 821,901 | 40.3% | x 0.86 |
| Meme region | 845,077 | 38.5% | x 0.83 |


### owner_distance_category

*Type: categorical | Impact: x 1.62*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 157,889 | 71.7% | x 1.54 |
| 5-20 km | 416,720 | 46.8% | x 1.00 |
| Plus de 100 km | 420,827 | 45.6% | x 0.98 |
| 20-50 km | 218,958 | 45.4% | x 0.97 |
| 50-100 km | 124,886 | 44.9% | x 0.96 |
| Moins de 5 km | 1,190,450 | 44.2% | x 0.95 |


### owner_is_local

*Type: boolean | Impact: x 1.57*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire local | 648,385 | 63.9% | x 1.37 |
| Proprietaire non local | 1,881,345 | 40.8% | x 0.87 |


### owner_housing_count

*Type: continuous | Impact: x 1.45*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 252,973 | 44.2% | x 0.95 |
| Q2: 1-1 | 252,973 | 43.4% | x 0.93 |
| Q3: 1-1 | 252,973 | 43.0% | x 0.92 |
| Q4: 1-1 | 252,973 | 40.5% | x 0.87 |
| Q5: 1-1 | 252,973 | 48.1% | x 1.03 |
| Q6: 1-1 | 252,973 | 43.1% | x 0.92 |
| Q7: 1-2 | 252,973 | 44.7% | x 0.96 |
| Q8: 2-3 | 252,973 | 48.3% | x 1.03 |
| Q9: 3-6 | 252,973 | 53.0% | x 1.13 |
| Q10: 6-15269 | 252,973 | 58.9% | x 1.26 |


### owner_portfolio_category

*Type: categorical | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Plus de 10 logements | 161,956 | 59.5% | x 1.27 |
| 6-10 logements | 123,934 | 57.0% | x 1.22 |
| 2-5 logements | 719,617 | 48.6% | x 1.04 |
| 1 logement | 1,524,223 | 43.6% | x 0.93 |


### owner_age

*Type: continuous | Impact: x 1.27*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -43-42 | 140,723 | 69.2% | x 1.48 |
| Q2: 42-50 | 140,722 | 64.0% | x 1.37 |
| Q3: 50-56 | 140,722 | 61.2% | x 1.31 |
| Q4: 56-61 | 140,722 | 58.1% | x 1.24 |
| Q5: 61-66 | 140,722 | 57.8% | x 1.24 |
| Q6: 66-71 | 140,722 | 57.5% | x 1.23 |
| Q7: 71-76 | 140,722 | 56.1% | x 1.20 |
| Q8: 76-81 | 140,722 | 54.6% | x 1.17 |
| Q9: 81-91 | 140,722 | 55.8% | x 1.19 |
| Q10: 91-2025 | 140,722 | 58.0% | x 1.24 |


### owner_is_multi_owner

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Multi-proprietaire | 1,005,507 | 51.4% | x 1.10 |
| Mono-proprietaire | 1,524,223 | 43.6% | x 0.93 |


### owner_is_sci

*Type: boolean | Impact: x 1.16*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non SCI | 2,087,881 | 47.9% | x 1.02 |
| SCI | 441,849 | 41.3% | x 0.88 |


### owner_is_individual

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non particulier | 745,673 | 50.6% | x 1.08 |
| Particulier | 1,784,057 | 45.1% | x 0.97 |


### owner_distance_km

*Type: continuous | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 237,185 | 43.9% | x 0.94 |
| Q2: 0-0 | 237,184 | 44.6% | x 0.96 |
| Q3: 0-1 | 237,184 | 41.8% | x 0.89 |
| Q4: 1-2 | 237,184 | 45.1% | x 0.96 |
| Q5: 2-5 | 237,184 | 45.5% | x 0.97 |
| Q6: 5-11 | 237,184 | 46.9% | x 1.00 |
| Q7: 11-24 | 237,184 | 46.5% | x 1.00 |
| Q8: 24-72 | 237,184 | 45.0% | x 0.96 |
| Q9: 72-291 | 237,184 | 44.9% | x 0.96 |
| Q10: 291-17411 | 237,184 | 46.3% | x 0.99 |


### owner_is_distant

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Proprietaire distant | 214,367 | 51.4% | x 1.10 |
| Proprietaire proche | 2,315,363 | 46.3% | x 0.99 |


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
| usufruitier | 55,659 | 0.0% | x 0.00 |
| nu-proprietaire | 42,837 | 0.0% | x 0.00 |
| proprietaire-entier | 1,239,629 | 0.0% | x 0.00 |
| administrateur | 3,467 | 0.0% | x 0.00 |
| autre | 4,686 | 0.0% | x 0.00 |


### property_right_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 1,183,293 | 99.9% | x 2.14 |
| Demembrement | 98,496 | 0.0% | x 0.00 |
| Autre | 1,247,941 | 0.0% | x 0.00 |

