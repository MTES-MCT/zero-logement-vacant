# Caracteristiques - Analyse des features

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
| 1 | is_taxed | x 3.98 | 79.5% (Non taxe) | 20.0% (Taxe vacance) |
| 2 | vacancy_severity | x 3.93 | 66.9% (Moderee) | 17.0% (Legere) |
| 3 | vacancy_duration_category | x 3.88 | 66.1% (3-5 ans) | 17.0% (0-2 ans) |
| 4 | cadastral_classification_label | x 3.20 | 93.1% (Inconnu) | 29.1% (Tres mediocre) |
| 5 | has_recent_mutation | x 3.10 | 52.0% (Pas de mutation recente) | 16.8% (Mutation recente) |

---

## Detail par feature

### is_taxed

*Type: boolean | Impact: x 3.98*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non taxe | 1,136,054 | 79.5% | x 1.70 |
| Taxe vacance | 1,393,676 | 20.0% | x 0.43 |


### vacancy_severity

*Type: categorical | Impact: x 3.93*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moderee | 1,026,164 | 66.9% | x 1.43 |
| Severe | 709,598 | 50.7% | x 1.09 |
| Legere | 793,968 | 17.0% | x 0.36 |


### vacancy_duration_category

*Type: categorical | Impact: x 3.88*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 3-5 ans | 723,384 | 66.1% | x 1.41 |
| 6-10 ans | 1,012,378 | 56.1% | x 1.20 |
| 0-2 ans | 793,968 | 17.0% | x 0.36 |


### cadastral_classification_label

*Type: categorical | Impact: x 3.20*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 13,095 | 93.1% | x 1.99 |
| Confortable | 148,287 | 53.1% | x 1.14 |
| Assez confortable | 852,011 | 51.8% | x 1.11 |
| Tres confortable | 16,687 | 51.1% | x 1.09 |
| Luxe | 1,559 | 47.5% | x 1.02 |
| Ordinaire | 1,096,713 | 46.7% | x 1.00 |
| Mediocre | 315,179 | 32.8% | x 0.70 |
| Tres mediocre | 86,058 | 29.1% | x 0.62 |


### has_recent_mutation

*Type: boolean | Impact: x 3.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Pas de mutation recente | 2,148,765 | 52.0% | x 1.11 |
| Mutation recente | 380,965 | 16.8% | x 0.36 |


### rental_value_category

*Type: categorical | Impact: x 2.54*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Inconnu | 253,414 | 100.0% | x 2.14 |
| Tres eleve (>3500€) | 6,250 | 52.7% | x 1.13 |
| Eleve (2000-3500€) | 19,929 | 46.9% | x 1.00 |
| Moyen (1000-2000€) | 136,066 | 44.0% | x 0.94 |
| Faible (500-1000€) | 566,044 | 43.6% | x 0.93 |
| Tres faible (<500€) | 1,548,027 | 39.4% | x 0.84 |


### condominium

*Type: categorical | Impact: x 2.54*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| single | 186,996 | 100.0% | x 2.14 |
| other | 1,156 | 100.0% | x 2.14 |
| co | 82,348 | 100.0% | x 2.14 |
| CL | 621,990 | 48.7% | x 1.04 |
| CLV | 709 | 42.3% | x 0.91 |
| CV | 10,753 | 41.6% | x 0.89 |
| TF | 1,379 | 39.4% | x 0.84 |


### cadastral_classification

*Type: categorical | Impact: x 1.83*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 4 | 148,287 | 53.1% | x 1.14 |
| 5 | 852,011 | 51.8% | x 1.11 |
| 3 | 16,687 | 51.1% | x 1.09 |
| 2 | 1,559 | 47.5% | x 1.02 |
| 6 | 1,096,713 | 46.7% | x 1.00 |
| 7 | 315,179 | 32.8% | x 0.70 |
| 8 | 86,058 | 29.1% | x 0.62 |


### cadastral_classification

*Type: continuous | Impact: x 1.76*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-5 | 251,664 | 52.2% | x 1.12 |
| Q2: 5-5 | 251,664 | 52.3% | x 1.12 |
| Q3: 5-5 | 251,664 | 48.7% | x 1.04 |
| Q4: 5-5 | 251,664 | 53.8% | x 1.15 |
| Q5: 5-6 | 251,664 | 47.2% | x 1.01 |
| Q6: 6-6 | 251,663 | 48.1% | x 1.03 |
| Q7: 6-6 | 251,663 | 44.2% | x 0.95 |
| Q8: 6-6 | 251,663 | 48.3% | x 1.03 |
| Q9: 6-7 | 251,663 | 39.3% | x 0.84 |
| Q10: 7-8 | 251,663 | 30.6% | x 0.65 |


### rental_value

*Type: continuous | Impact: x 1.56*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-130 | 227,632 | 28.4% | x 0.61 |
| Q2: 130-198 | 227,632 | 35.2% | x 0.75 |
| Q3: 198-254 | 227,632 | 40.0% | x 0.86 |
| Q4: 254-307 | 227,632 | 42.3% | x 0.91 |
| Q5: 307-365 | 227,632 | 43.0% | x 0.92 |
| Q6: 365-433 | 227,632 | 43.6% | x 0.93 |
| Q7: 433-518 | 227,631 | 43.7% | x 0.94 |
| Q8: 518-643 | 227,631 | 43.7% | x 0.94 |
| Q9: 643-874 | 227,631 | 43.4% | x 0.93 |
| Q10: 874-33600 | 227,631 | 44.3% | x 0.95 |


### is_uncomfortable

*Type: boolean | Impact: x 1.52*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Confortable | 1,888,124 | 51.1% | x 1.09 |
| Inconfortable | 641,606 | 33.7% | x 0.72 |


### energy_consumption_category

*Type: categorical | Impact: x 1.51*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Performant (A-B) | 9,597 | 62.8% | x 1.34 |
| Moyen (C-D) | 312,078 | 62.7% | x 1.34 |
| Peu performant (E) | 203,347 | 60.3% | x 1.29 |
| Passoire (F-G) | 158,886 | 57.1% | x 1.22 |
| Inconnu | 1,845,822 | 41.5% | x 0.89 |


### housing_kind

*Type: categorical | Impact: x 1.33*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| APPART | 1,320,112 | 52.9% | x 1.13 |
| MAISON | 1,209,618 | 39.9% | x 0.85 |


### building_age

*Type: continuous | Impact: x 1.30*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-21 | 247,209 | 53.3% | x 1.14 |
| Q2: 21-41 | 247,209 | 52.0% | x 1.11 |
| Q3: 41-55 | 247,208 | 48.4% | x 1.04 |
| Q4: 55-70 | 247,208 | 49.2% | x 1.05 |
| Q5: 70-103 | 247,208 | 46.1% | x 0.99 |
| Q6: 103-125 | 247,208 | 44.7% | x 0.96 |
| Q7: 125-145 | 247,208 | 46.8% | x 1.00 |
| Q8: 145-175 | 247,208 | 42.6% | x 0.91 |
| Q9: 175-225 | 247,208 | 41.1% | x 0.88 |
| Q10: 225-825 | 247,208 | 41.9% | x 0.90 |


### building_year_category

*Type: categorical | Impact: x 1.29*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 2000-2009 | 148,486 | 54.8% | x 1.17 |
| 1990-1999 | 133,596 | 52.6% | x 1.13 |
| 2010 et apres | 154,424 | 51.7% | x 1.11 |
| Inconnu | 57,648 | 51.0% | x 1.09 |
| 1950-1969 | 301,979 | 48.9% | x 1.05 |
| 1970-1989 | 312,574 | 48.7% | x 1.04 |
| 1900-1949 | 513,634 | 45.9% | x 0.98 |
| Avant 1900 | 907,389 | 42.4% | x 0.91 |


### building_year

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-1800 | 247,776 | 42.2% | x 0.90 |
| Q2: 1800-1850 | 247,776 | 41.2% | x 0.88 |
| Q3: 1850-1879 | 247,776 | 43.4% | x 0.93 |
| Q4: 1879-1900 | 247,776 | 44.7% | x 0.96 |
| Q5: 1900-1922 | 247,776 | 46.9% | x 1.00 |
| Q6: 1922-1955 | 247,776 | 46.1% | x 0.99 |
| Q7: 1955-1970 | 247,776 | 49.1% | x 1.05 |
| Q8: 1970-1984 | 247,776 | 48.5% | x 1.04 |
| Q9: 1984-2004 | 247,776 | 52.0% | x 1.11 |
| Q10: 2004-2024 | 247,775 | 53.3% | x 1.14 |


### data_years_count

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 252,973 | 49.9% | x 1.07 |
| Q2: 1-1 | 252,973 | 45.5% | x 0.97 |
| Q3: 1-1 | 252,973 | 46.2% | x 0.99 |
| Q4: 1-1 | 252,973 | 46.9% | x 1.00 |
| Q5: 1-1 | 252,973 | 54.9% | x 1.17 |
| Q6: 1-2 | 252,973 | 49.9% | x 1.07 |
| Q7: 2-2 | 252,973 | 43.8% | x 0.94 |
| Q8: 2-2 | 252,973 | 42.6% | x 0.91 |
| Q9: 2-2 | 252,973 | 45.0% | x 0.96 |
| Q10: 2-4 | 252,973 | 42.6% | x 0.91 |


### building_age_category

*Type: categorical | Impact: x 1.23*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Recent (<20 ans) | 223,757 | 53.3% | x 1.14 |
| Inconnu | 57,648 | 51.0% | x 1.09 |
| Moderne (20-50 ans) | 395,031 | 50.9% | x 1.09 |
| Ancien (50-100 ans) | 584,929 | 48.0% | x 1.03 |
| Tres ancien (>100 ans) | 1,268,365 | 43.4% | x 0.93 |


### beneficiary_count

*Type: continuous | Impact: x 1.19*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-1 | 185,206 | 48.8% | x 1.04 |
| Q2: 1-1 | 185,206 | 49.1% | x 1.05 |
| Q3: 1-1 | 185,206 | 55.9% | x 1.20 |
| Q4: 1-1 | 185,206 | 46.9% | x 1.00 |
| Q5: 1-1 | 185,206 | 50.3% | x 1.08 |
| Q6: 1-1 | 185,205 | 50.8% | x 1.09 |
| Q7: 1-2 | 185,205 | 52.7% | x 1.13 |
| Q8: 2-2 | 185,205 | 54.9% | x 1.18 |
| Q9: 2-2 | 185,205 | 54.4% | x 1.16 |
| Q10: 2-6 | 185,205 | 51.6% | x 1.11 |


### rooms_count

*Type: continuous | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-1 | 252,885 | 46.1% | x 0.99 |
| Q2: 1-1 | 252,885 | 48.5% | x 1.04 |
| Q3: 1-2 | 252,885 | 49.1% | x 1.05 |
| Q4: 2-2 | 252,884 | 46.5% | x 1.00 |
| Q5: 2-3 | 252,884 | 51.4% | x 1.10 |
| Q6: 3-3 | 252,884 | 43.6% | x 0.93 |
| Q7: 3-3 | 252,884 | 47.2% | x 1.01 |
| Q8: 3-4 | 252,884 | 46.0% | x 0.98 |
| Q9: 4-5 | 252,884 | 45.5% | x 0.97 |
| Q10: 5-198 | 252,884 | 43.5% | x 0.93 |


### living_area

*Type: continuous | Impact: x 1.17*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-25 | 252,885 | 49.6% | x 1.06 |
| Q2: 25-33 | 252,885 | 50.6% | x 1.08 |
| Q3: 33-42 | 252,885 | 48.5% | x 1.04 |
| Q4: 42-50 | 252,884 | 47.7% | x 1.02 |
| Q5: 50-60 | 252,884 | 46.8% | x 1.00 |
| Q6: 60-70 | 252,884 | 47.1% | x 1.01 |
| Q7: 70-80 | 252,884 | 45.4% | x 0.97 |
| Q8: 80-93 | 252,884 | 44.7% | x 0.96 |
| Q9: 93-118 | 252,884 | 43.7% | x 0.94 |
| Q10: 118-300000 | 252,884 | 43.1% | x 0.92 |


### energy_consumption_bdnb

*Type: categorical | Impact: x 1.13*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| B | 7,159 | 63.6% | x 1.36 |
| C | 92,666 | 63.6% | x 1.36 |
| D | 219,412 | 62.4% | x 1.34 |
| E | 203,347 | 60.3% | x 1.29 |
| A | 2,438 | 60.2% | x 1.29 |
| F | 93,818 | 57.7% | x 1.24 |
| G | 65,068 | 56.2% | x 1.20 |


### is_energy_sieve

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non passoire | 525,022 | 61.8% | x 1.32 |
| Passoire energetique | 158,886 | 57.1% | x 1.22 |


### housing_kind_label

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Autre | 2,529,730 | 46.7% | x 1.00 |


### rooms_count_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 1 piece | 513,709 | 48.2% | x 1.03 |
| 2 pieces | 616,220 | 48.1% | x 1.03 |
| 3 pieces | 632,849 | 46.6% | x 1.00 |
| 4 pieces | 425,427 | 45.8% | x 0.98 |
| 5 pieces et plus | 340,638 | 43.4% | x 0.93 |
| Inconnu | 887 | 0.0% | x 0.00 |


### living_area_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moins de 30m2 | 376,127 | 50.2% | x 1.08 |
| 30-49m2 | 585,099 | 48.7% | x 1.04 |
| 50-79m2 | 790,647 | 46.5% | x 0.99 |
| 80-99m2 | 345,172 | 44.5% | x 0.95 |
| 100-149m2 | 320,684 | 43.3% | x 0.93 |
| 150m2 et plus | 111,114 | 43.1% | x 0.92 |
| Inconnu | 887 | 0.0% | x 0.00 |


### surface_category

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Petit (<50m2) | 961,226 | 49.3% | x 1.06 |
| Moyen (50-100m2) | 1,135,819 | 45.9% | x 0.98 |
| Grand (>100m2) | 431,798 | 43.2% | x 0.93 |
| Inconnu | 887 | 0.0% | x 0.00 |


### vacancy_status_label

*Type: categorical | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Sorti de vacance | 1,181,700 | 100.0% | x 2.14 |
| Toujours vacant | 1,348,030 | 0.0% | x 0.00 |


### years_in_vacancy

*Type: continuous | Impact: x 0.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 252,973 | 0.0% | x 0.00 |
| Q2: 1-2 | 252,973 | 1.9% | x 0.04 |
| Q3: 2-2 | 252,973 | 45.4% | x 0.97 |
| Q4: 2-3 | 252,973 | 57.7% | x 1.24 |
| Q5: 3-4 | 252,973 | 68.2% | x 1.46 |
| Q6: 4-6 | 252,973 | 69.4% | x 1.49 |
| Q7: 6-7 | 252,973 | 65.3% | x 1.40 |
| Q8: 7-7 | 252,973 | 52.9% | x 1.13 |
| Q9: 7-7 | 252,973 | 52.0% | x 1.11 |
| Q10: 7-7 | 252,973 | 54.4% | x 1.16 |

