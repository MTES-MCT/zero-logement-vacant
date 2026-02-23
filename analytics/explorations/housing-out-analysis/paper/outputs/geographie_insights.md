# Geographie - Analyse des features

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
| 1 | date_thlv | x 1.88 | 65.1% (2022-09-15) | 34.6% (2024-11-04) |
| 2 | departement_code | x 1.66 | 55.9% (76) | 33.7% (23) |
| 3 | dvf_total_transactions_2019_2024 | x 1.55 | 56.5% (Q10) | 36.5% (Q1) |
| 4 | population_2022 | x 1.52 | 55.6% (Q10) | 36.6% (Q1) |
| 5 | densite_label_7 | x 1.51 | 53.6% (Grands centres urbains) | 35.5% (Rural à habitat très dispersé) |

---

## Detail par feature

### date_thlv

*Type: categorical | Impact: x 1.88*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 2022-09-15 | 3,686 | 65.1% | x 1.39 |
| 2022-04-07 | 6,032 | 63.0% | x 1.35 |
| 2010-06-29 | 604 | 62.9% | x 1.35 |
| 2022-09-05 | 987 | 62.6% | x 1.34 |
| 2022-12-07 | 4,491 | 62.6% | x 1.34 |
| 2011-05-16 | 1,169 | 62.4% | x 1.33 |
| 2021-12-07 | 1,842 | 62.2% | x 1.33 |
| 2018-09-26 | 2,266 | 62.0% | x 1.33 |
| 2015-06-07 | 1,779 | 61.6% | x 1.32 |
| 2010-12-07 | 5,507 | 61.0% | x 1.31 |
| ... | (290 autres modalites) | ... | ... |


### departement_code

*Type: categorical | Impact: x 1.66*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 76 | 39,747 | 55.9% | x 1.20 |
| 84 | 30,694 | 53.4% | x 1.14 |
| 34 | 50,198 | 52.8% | x 1.13 |
| 75 | 75,895 | 52.3% | x 1.12 |
| 77 | 35,191 | 51.9% | x 1.11 |
| 2A | 14,887 | 51.9% | x 1.11 |
| 54 | 30,536 | 51.5% | x 1.10 |
| 59 | 73,032 | 50.8% | x 1.09 |
| 90 | 5,882 | 50.6% | x 1.08 |
| 42 | 39,433 | 50.5% | x 1.08 |
| ... | (87 autres modalites) | ... | ... |


### dvf_total_transactions_2019_2024

*Type: continuous | Impact: x 1.55*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-32 | 218,387 | 36.5% | x 0.78 |
| Q2: 32-69 | 218,386 | 38.6% | x 0.83 |
| Q3: 69-127 | 218,386 | 40.8% | x 0.87 |
| Q4: 127-234 | 218,386 | 42.8% | x 0.92 |
| Q5: 234-425 | 218,386 | 45.4% | x 0.97 |
| Q6: 425-842 | 218,386 | 47.5% | x 1.02 |
| Q7: 842-1682 | 218,386 | 49.7% | x 1.06 |
| Q8: 1682-3600 | 218,386 | 51.7% | x 1.11 |
| Q9: 3600-10572 | 218,386 | 53.4% | x 1.14 |
| Q10: 10572-50510 | 218,386 | 56.5% | x 1.21 |


### population_2022

*Type: continuous | Impact: x 1.52*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-417 | 240,487 | 36.6% | x 0.78 |
| Q2: 417-901 | 240,487 | 39.0% | x 0.83 |
| Q3: 901-1692 | 240,487 | 40.9% | x 0.88 |
| Q4: 1692-3137 | 240,487 | 43.5% | x 0.93 |
| Q5: 3137-5694 | 240,486 | 45.8% | x 0.98 |
| Q6: 5694-10740 | 240,486 | 48.4% | x 1.04 |
| Q7: 10740-21433 | 240,486 | 49.9% | x 1.07 |
| Q8: 21433-44529 | 240,486 | 52.3% | x 1.12 |
| Q9: 44529-104924 | 240,486 | 52.9% | x 1.13 |
| Q10: 104924-511684 | 240,486 | 55.6% | x 1.19 |


### densite_label_7

*Type: categorical | Impact: x 1.51*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Grands centres urbains | 589,928 | 53.6% | x 1.15 |
| Centres urbains intermédiaires | 370,344 | 51.9% | x 1.11 |
| Petites villes | 183,557 | 47.9% | x 1.02 |
| Ceintures urbaines | 168,339 | 46.0% | x 0.99 |
| Bourgs ruraux | 435,989 | 44.1% | x 0.94 |
| Rural à habitat dispersé | 496,910 | 39.2% | x 0.84 |
| Rural à habitat très dispersé | 159,797 | 35.5% | x 0.76 |


### densite_grid_7

*Type: continuous | Impact: x 1.50*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 240,487 | 50.2% | x 1.08 |
| Q2: 1-1 | 240,487 | 55.7% | x 1.19 |
| Q3: 1-2 | 240,487 | 53.9% | x 1.15 |
| Q4: 2-3 | 240,487 | 51.8% | x 1.11 |
| Q5: 3-4 | 240,486 | 47.4% | x 1.02 |
| Q6: 4-5 | 240,486 | 44.5% | x 0.95 |
| Q7: 5-5 | 240,486 | 44.5% | x 0.95 |
| Q8: 5-6 | 240,486 | 39.7% | x 0.85 |
| Q9: 6-6 | 240,486 | 39.7% | x 0.85 |
| Q10: 6-7 | 240,486 | 37.2% | x 0.80 |


### loyer_predit_m2

*Type: continuous | Impact: x 1.45*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 6-8 | 239,435 | 36.5% | x 0.78 |
| Q2: 8-8 | 239,435 | 39.4% | x 0.84 |
| Q3: 8-9 | 239,435 | 42.0% | x 0.90 |
| Q4: 9-10 | 239,435 | 45.0% | x 0.96 |
| Q5: 10-11 | 239,435 | 47.9% | x 1.03 |
| Q6: 11-12 | 239,435 | 49.1% | x 1.05 |
| Q7: 12-13 | 239,435 | 51.3% | x 1.10 |
| Q8: 13-14 | 239,435 | 52.9% | x 1.13 |
| Q9: 14-17 | 239,435 | 51.6% | x 1.11 |
| Q10: 17-34 | 239,435 | 47.9% | x 1.03 |


### loyer_type_prediction

*Type: categorical | Impact: x 1.44*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| commune | 1,525,984 | 50.5% | x 1.08 |
| maille | 857,762 | 39.1% | x 0.84 |
| EPCI | 10,604 | 35.0% | x 0.75 |


### densite_grid

*Type: continuous | Impact: x 1.41*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 240,487 | 54.9% | x 1.17 |
| Q2: 1-1 | 240,487 | 52.6% | x 1.13 |
| Q3: 1-2 | 240,487 | 49.7% | x 1.06 |
| Q4: 2-2 | 240,487 | 54.7% | x 1.17 |
| Q5: 2-2 | 240,486 | 47.3% | x 1.01 |
| Q6: 2-3 | 240,486 | 43.9% | x 0.94 |
| Q7: 3-3 | 240,486 | 39.0% | x 0.83 |
| Q8: 3-3 | 240,486 | 42.9% | x 0.92 |
| Q9: 3-3 | 240,486 | 40.1% | x 0.86 |
| Q10: 3-3 | 240,486 | 39.8% | x 0.85 |


### pct_pop_rural

*Type: continuous | Impact: x 1.40*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -0-0 | 240,487 | 52.0% | x 1.11 |
| Q2: 0-1 | 240,487 | 55.1% | x 1.18 |
| Q3: 1-3 | 240,487 | 52.8% | x 1.13 |
| Q4: 3-7 | 240,487 | 51.1% | x 1.09 |
| Q5: 7-20 | 240,486 | 48.5% | x 1.04 |
| Q6: 20-100 | 240,486 | 43.2% | x 0.92 |
| Q7: 100-100 | 240,486 | 39.5% | x 0.84 |
| Q8: 100-100 | 240,486 | 39.5% | x 0.85 |
| Q9: 100-100 | 240,486 | 39.8% | x 0.85 |
| Q10: 100-100 | 240,486 | 43.4% | x 0.93 |


### dvf_marche_dynamisme

*Type: categorical | Impact: x 1.38*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Très dynamique | 1,616,394 | 49.1% | x 1.05 |
| Dynamique | 368,964 | 39.1% | x 0.84 |
| Modéré | 157,616 | 36.6% | x 0.78 |
| Faible | 40,887 | 35.6% | x 0.76 |


### pct_pop_urbain_dense

*Type: continuous | Impact: x 1.34*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 240,487 | 44.2% | x 0.95 |
| Q2: 0-0 | 240,487 | 40.8% | x 0.87 |
| Q3: 0-0 | 240,487 | 44.2% | x 0.95 |
| Q4: 0-0 | 240,487 | 43.2% | x 0.93 |
| Q5: 0-0 | 240,486 | 42.6% | x 0.91 |
| Q6: 0-0 | 240,486 | 46.2% | x 0.99 |
| Q7: 0-0 | 240,486 | 46.7% | x 1.00 |
| Q8: 0-88 | 240,486 | 49.6% | x 1.06 |
| Q9: 88-99 | 240,486 | 54.7% | x 1.17 |
| Q10: 99-100 | 240,486 | 52.5% | x 1.12 |


### densite_aav_label

*Type: categorical | Impact: x 1.33*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Urbain dense | 589,928 | 53.6% | x 1.15 |
| Urbain intermédiaire | 722,240 | 49.5% | x 1.06 |
| Rural périurbain | 456,674 | 41.3% | x 0.88 |
| Rural non périurbain | 636,022 | 40.1% | x 0.86 |


### housing_kind

*Type: categorical | Impact: x 1.33*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| APPART | 1,320,112 | 52.9% | x 1.13 |
| MAISON | 1,209,618 | 39.9% | x 0.85 |


### densite_label

*Type: categorical | Impact: x 1.32*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Urbain dense | 589,928 | 53.6% | x 1.15 |
| Urbain intermédiaire | 722,240 | 49.5% | x 1.06 |
| Rural | 1,092,696 | 40.6% | x 0.87 |


### densite_category

*Type: categorical | Impact: x 1.32*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Urbain dense | 589,928 | 53.6% | x 1.15 |
| Urbain intermédiaire | 722,240 | 49.5% | x 1.06 |
| Rural | 1,092,696 | 40.6% | x 0.87 |


### taux_artificialisation_pct

*Type: continuous | Impact: x 1.30*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 239,403 | 41.3% | x 0.88 |
| Q2: 0-0 | 239,402 | 40.0% | x 0.86 |
| Q3: 0-0 | 239,402 | 42.5% | x 0.91 |
| Q4: 0-1 | 239,402 | 44.3% | x 0.95 |
| Q5: 1-1 | 239,402 | 45.9% | x 0.98 |
| Q6: 1-1 | 239,402 | 47.5% | x 1.02 |
| Q7: 1-2 | 239,402 | 49.7% | x 1.06 |
| Q8: 2-2 | 239,402 | 49.6% | x 1.06 |
| Q9: 2-3 | 239,402 | 50.7% | x 1.09 |
| Q10: 3-36 | 239,402 | 52.1% | x 1.11 |


### fiscalite_annee_reference

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 2024-2024 | 240,466 | 44.1% | x 0.94 |
| Q2: 2024-2024 | 240,466 | 46.9% | x 1.00 |
| Q3: 2024-2024 | 240,466 | 45.7% | x 0.98 |
| Q4: 2024-2024 | 240,466 | 43.6% | x 0.93 |
| Q5: 2024-2024 | 240,466 | 47.7% | x 1.02 |
| Q6: 2024-2024 | 240,465 | 43.7% | x 0.94 |
| Q7: 2024-2024 | 240,465 | 45.2% | x 0.97 |
| Q8: 2024-2024 | 240,465 | 56.3% | x 1.20 |
| Q9: 2024-2024 | 240,465 | 44.6% | x 0.95 |
| Q10: 2024-2024 | 240,465 | 47.0% | x 1.01 |


### taux_th

*Type: continuous | Impact: x 1.28*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-19 | 240,466 | 41.1% | x 0.88 |
| Q2: 19-21 | 240,466 | 42.4% | x 0.91 |
| Q3: 21-23 | 240,466 | 43.3% | x 0.93 |
| Q4: 23-25 | 240,466 | 44.8% | x 0.96 |
| Q5: 25-26 | 240,466 | 45.0% | x 0.96 |
| Q6: 26-28 | 240,465 | 46.5% | x 1.00 |
| Q7: 28-30 | 240,465 | 47.1% | x 1.01 |
| Q8: 30-32 | 240,465 | 49.5% | x 1.06 |
| Q9: 32-35 | 240,465 | 52.5% | x 1.12 |
| Q10: 35-72 | 240,465 | 52.6% | x 1.13 |


### dvf_evolution_prix_m2_2019_2023_pct

*Type: continuous | Impact: x 1.27*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -90-4 | 213,448 | 40.4% | x 0.87 |
| Q2: 4-11 | 213,448 | 46.3% | x 0.99 |
| Q3: 11-15 | 213,448 | 48.4% | x 1.04 |
| Q4: 15-19 | 213,448 | 48.3% | x 1.03 |
| Q5: 19-21 | 213,448 | 51.2% | x 1.10 |
| Q6: 21-25 | 213,448 | 49.5% | x 1.06 |
| Q7: 25-29 | 213,448 | 48.5% | x 1.04 |
| Q8: 29-36 | 213,448 | 47.4% | x 1.02 |
| Q9: 36-48 | 213,448 | 44.1% | x 0.94 |
| Q10: 48-1342 | 213,448 | 41.1% | x 0.88 |


### zonage_en_vigueur

*Type: categorical | Impact: x 1.26*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| B1 | 633,754 | 51.9% | x 1.11 |
| A | 323,199 | 50.5% | x 1.08 |
| B2 | 284,758 | 49.0% | x 1.05 |
| Abis | 79,306 | 48.1% | x 1.03 |
| C | 1,083,847 | 41.3% | x 0.88 |


### niveau_loyer

*Type: categorical | Impact: x 1.24*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Moyen | 987,973 | 50.6% | x 1.08 |
| Élevé | 545,881 | 50.2% | x 1.07 |
| Bas | 995,876 | 40.9% | x 0.88 |


### taux_th_category

*Type: categorical | Impact: x 1.21*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Très Élevé | 1,325,092 | 49.8% | x 1.07 |
| Élevé | 533,687 | 44.9% | x 0.96 |
| Moyen | 392,831 | 42.7% | x 0.91 |
| Faible | 278,120 | 41.2% | x 0.88 |


### loyer_confiance_prediction

*Type: categorical | Impact: x 1.20*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Faible | 138,811 | 52.8% | x 1.13 |
| Forte | 706,456 | 51.9% | x 1.11 |
| Moyenne | 1,684,463 | 44.0% | x 0.94 |


### taux_tfb

*Type: continuous | Impact: x 1.20*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 4-32 | 240,466 | 44.8% | x 0.96 |
| Q2: 32-36 | 240,466 | 42.7% | x 0.91 |
| Q3: 36-39 | 240,466 | 43.3% | x 0.93 |
| Q4: 39-42 | 240,466 | 43.7% | x 0.94 |
| Q5: 42-44 | 240,466 | 45.0% | x 0.96 |
| Q6: 44-46 | 240,465 | 47.6% | x 1.02 |
| Q7: 46-49 | 240,465 | 48.4% | x 1.04 |
| Q8: 49-52 | 240,465 | 49.1% | x 1.05 |
| Q9: 52-56 | 240,465 | 51.4% | x 1.10 |
| Q10: 56-107 | 240,465 | 48.8% | x 1.04 |


### action_coeur_de_ville

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Action Coeur de Ville | 387,310 | 53.7% | x 1.15 |
| Hors ACV | 2,142,420 | 45.5% | x 0.97 |


### village_davenir

*Type: boolean | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Hors VDA | 2,397,805 | 47.1% | x 1.01 |
| Village d Avenir | 131,925 | 39.9% | x 0.86 |


### th_surtaxe_residences_secondaires_pct

*Type: continuous | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 5-20 | 38,505 | 48.3% | x 1.03 |
| Q2: 20-25 | 38,505 | 45.9% | x 0.98 |
| Q3: 25-35 | 38,505 | 50.7% | x 1.09 |
| Q4: 35-40 | 38,505 | 49.1% | x 1.05 |
| Q5: 40-50 | 38,505 | 49.9% | x 1.07 |
| Q6: 50-60 | 38,505 | 51.1% | x 1.09 |
| Q7: 60-60 | 38,505 | 47.4% | x 1.01 |
| Q8: 60-60 | 38,504 | 51.6% | x 1.11 |
| Q9: 60-60 | 38,504 | 54.0% | x 1.16 |
| Q10: 60-60 | 38,504 | 48.3% | x 1.03 |


### years_in_tlv

*Type: continuous | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 240,487 | 43.0% | x 0.92 |
| Q2: 0-0 | 240,487 | 44.9% | x 0.96 |
| Q3: 0-0 | 240,487 | 46.0% | x 0.98 |
| Q4: 0-0 | 240,487 | 44.9% | x 0.96 |
| Q5: 0-0 | 240,486 | 43.3% | x 0.93 |
| Q6: 0-0 | 240,486 | 46.8% | x 1.00 |
| Q7: 0-0 | 240,486 | 47.4% | x 1.01 |
| Q8: 0-3 | 240,486 | 49.3% | x 1.05 |
| Q9: 3-13 | 240,486 | 48.5% | x 1.04 |
| Q10: 13-13 | 240,486 | 50.7% | x 1.09 |


### population_growth_rate_annual

*Type: continuous | Impact: x 1.17*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -20--1 | 239,408 | 41.8% | x 0.90 |
| Q2: -1--1 | 239,408 | 43.7% | x 0.93 |
| Q3: -1--0 | 239,408 | 45.9% | x 0.98 |
| Q4: -0--0 | 239,408 | 46.9% | x 1.00 |
| Q5: -0-0 | 239,407 | 47.6% | x 1.02 |
| Q6: 0-0 | 239,407 | 47.9% | x 1.03 |
| Q7: 0-1 | 239,407 | 48.7% | x 1.04 |
| Q8: 1-1 | 239,407 | 47.2% | x 1.01 |
| Q9: 1-2 | 239,407 | 48.9% | x 1.05 |
| Q10: 2-94 | 239,407 | 45.1% | x 0.96 |


### taux_tfb_category

*Type: categorical | Impact: x 1.15*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Très Élevé | 1,144,156 | 49.5% | x 1.06 |
| Élevé | 548,515 | 45.7% | x 0.98 |
| Faible | 404,626 | 44.1% | x 0.94 |
| Moyen | 432,433 | 43.0% | x 0.92 |


### teom_taux

*Type: continuous | Impact: x 1.15*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-7 | 198,340 | 49.3% | x 1.06 |
| Q2: 7-8 | 198,340 | 51.1% | x 1.09 |
| Q3: 8-10 | 198,340 | 48.8% | x 1.05 |
| Q4: 10-10 | 198,340 | 48.4% | x 1.04 |
| Q5: 10-11 | 198,339 | 46.9% | x 1.00 |
| Q6: 11-12 | 198,339 | 46.5% | x 0.99 |
| Q7: 12-13 | 198,339 | 44.5% | x 0.95 |
| Q8: 13-14 | 198,339 | 45.8% | x 0.98 |
| Q9: 14-16 | 198,339 | 46.0% | x 0.99 |
| Q10: 16-37 | 198,339 | 46.6% | x 1.00 |


### evolution_taux_teom_2021_2024_pct

*Type: continuous | Impact: x 1.14*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -81--3 | 194,757 | 45.6% | x 0.98 |
| Q2: -3-0 | 194,757 | 48.9% | x 1.05 |
| Q3: 0-0 | 194,757 | 46.2% | x 0.99 |
| Q4: 0-0 | 194,757 | 52.0% | x 1.11 |
| Q5: 0-0 | 194,756 | 47.8% | x 1.02 |
| Q6: 0-4 | 194,756 | 48.1% | x 1.03 |
| Q7: 4-8 | 194,756 | 45.6% | x 0.98 |
| Q8: 8-13 | 194,756 | 46.1% | x 0.99 |
| Q9: 13-24 | 194,756 | 47.2% | x 1.01 |
| Q10: 24-1050 | 194,756 | 47.5% | x 1.02 |


### epci_regime_fiscal

*Type: categorical | Impact: x 1.13*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| FPU | 2,253,504 | 46.8% | x 1.00 |
| FPA | 64,010 | 43.0% | x 0.92 |
| FPZ | 86,874 | 41.5% | x 0.89 |


### ort_signed

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| ORT signe | 774,429 | 50.4% | x 1.08 |
| Sans ORT | 1,755,301 | 45.1% | x 0.97 |


### tlv_2026

*Type: categorical | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 1. Zone tendue | 529,890 | 50.3% | x 1.08 |
| 3. Non tendue | 1,688,900 | 45.4% | x 0.97 |
| 2. Zone touristique et tendue | 186,074 | 45.1% | x 0.97 |


### tlv_2023

*Type: categorical | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| 1. Zone tendue | 529,985 | 50.3% | x 1.08 |
| 3. Non tendue | 1,688,653 | 45.4% | x 0.97 |
| 2. Zone touristique et tendue | 186,226 | 45.1% | x 0.97 |


### is_in_tlv_territory

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Zone TLV | 529,890 | 50.3% | x 1.08 |
| Hors TLV | 1,874,974 | 45.4% | x 0.97 |


### taux_teom_category

*Type: categorical | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Faible | 933,915 | 49.1% | x 1.05 |
| Élevé | 510,520 | 45.8% | x 0.98 |
| Moyen | 612,379 | 45.5% | x 0.97 |
| Très Élevé | 472,916 | 44.6% | x 0.95 |


### evolution_taux_tfb_2021_2024_pct

*Type: continuous | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -66--0 | 240,459 | 46.3% | x 0.99 |
| Q2: -0-0 | 240,459 | 46.8% | x 1.00 |
| Q3: 0-0 | 240,459 | 47.1% | x 1.01 |
| Q4: 0-1 | 240,459 | 47.3% | x 1.01 |
| Q5: 1-1 | 240,459 | 46.5% | x 0.99 |
| Q6: 1-2 | 240,459 | 46.2% | x 0.99 |
| Q7: 2-4 | 240,459 | 44.5% | x 0.95 |
| Q8: 4-7 | 240,459 | 45.0% | x 0.96 |
| Q9: 7-11 | 240,459 | 46.3% | x 0.99 |
| Q10: 11-222 | 240,458 | 48.9% | x 1.05 |


### tlv_2013

*Type: categorical | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| TLV | 392,649 | 50.0% | x 1.07 |
| Non TLV | 2,012,215 | 45.8% | x 0.98 |


### is_in_thlv_territory

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Zone THLV | 767,280 | 49.4% | x 1.06 |
| Hors THLV | 1,637,584 | 45.1% | x 0.97 |


### th_surtaxe_indicateur

*Type: categorical | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| OUI | 385,047 | 49.6% | x 1.06 |
| NON | 2,019,608 | 45.9% | x 0.98 |


### evolution_taux_tfnb_2021_2024_pct

*Type: continuous | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -47--0 | 240,459 | 46.3% | x 0.99 |
| Q2: -0--0 | 240,459 | 47.2% | x 1.01 |
| Q3: -0-0 | 240,459 | 47.4% | x 1.01 |
| Q4: 0-0 | 240,459 | 47.2% | x 1.01 |
| Q5: 0-1 | 240,459 | 47.6% | x 1.02 |
| Q6: 1-1 | 240,459 | 44.8% | x 0.96 |
| Q7: 1-2 | 240,459 | 45.9% | x 0.98 |
| Q8: 2-2 | 240,459 | 47.2% | x 1.01 |
| Q9: 2-5 | 240,459 | 43.9% | x 0.94 |
| Q10: 5-131 | 240,458 | 47.2% | x 1.01 |


### is_population_declining

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Population stable/croissante | 1,402,308 | 47.6% | x 1.02 |
| Population en declin | 1,002,556 | 44.8% | x 0.96 |


### taux_tfnb

*Type: continuous | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 3-55 | 240,466 | 46.8% | x 1.00 |
| Q2: 55-69 | 240,466 | 47.1% | x 1.01 |
| Q3: 69-79 | 240,466 | 45.1% | x 0.96 |
| Q4: 79-87 | 240,466 | 46.5% | x 1.00 |
| Q5: 87-96 | 240,466 | 46.8% | x 1.00 |
| Q6: 96-107 | 240,465 | 46.0% | x 0.99 |
| Q7: 107-120 | 240,465 | 46.9% | x 1.00 |
| Q8: 120-137 | 240,465 | 47.8% | x 1.02 |
| Q9: 137-169 | 240,465 | 45.9% | x 0.98 |
| Q10: 169-547 | 240,465 | 45.9% | x 0.98 |


### evolution_taux_th_2021_2024_pct

*Type: continuous | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -97--0 | 240,459 | 45.8% | x 0.98 |
| Q2: -0-0 | 240,459 | 47.7% | x 1.02 |
| Q3: 0-0 | 240,459 | 46.1% | x 0.99 |
| Q4: 0-1 | 240,459 | 47.5% | x 1.02 |
| Q5: 1-2 | 240,459 | 47.2% | x 1.01 |
| Q6: 2-2 | 240,459 | 47.6% | x 1.02 |
| Q7: 2-3 | 240,459 | 46.3% | x 0.99 |
| Q8: 3-5 | 240,459 | 46.0% | x 0.98 |
| Q9: 5-11 | 240,459 | 45.2% | x 0.97 |
| Q10: 11-591 | 240,458 | 45.5% | x 0.97 |


### taux_tfnb_category

*Type: categorical | Impact: x 1.03*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Très Élevé | 840,779 | 47.2% | x 1.01 |
| Faible | 571,069 | 46.9% | x 1.00 |
| Élevé | 599,649 | 46.5% | x 1.00 |
| Moyen | 518,233 | 45.9% | x 0.98 |


### has_opah

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Sans OPAH | 1,656,626 | 47.0% | x 1.01 |
| Avec OPAH | 873,104 | 46.1% | x 0.99 |


### petite_ville_de_demain

*Type: boolean | Impact: x 1.01*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Hors PVD | 2,132,669 | 46.8% | x 1.00 |
| Petite Ville de Demain | 397,061 | 46.3% | x 0.99 |


### prix_median_m2_maisons_2024

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### prix_median_m2_appartements_2024

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_housing

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_housing_private

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_housing_private_rented

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_vacant_housing

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_vacant_housing_private

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### count_vacant_housing_private_fil

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### housing_vacant_rate

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### kind_housing_vacant_2025

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### kind_housing_vacant_same_as_2025

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### kind_housing_vacant_rate_2025

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### kind_housing_vacant_rate_same_as_2025

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### housing_vacant_evolution_19_25

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|


### housing_vacant_rate_evolution_19_25

*Type: continuous | Impact: x 0.00*

**Note**: No data

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|

