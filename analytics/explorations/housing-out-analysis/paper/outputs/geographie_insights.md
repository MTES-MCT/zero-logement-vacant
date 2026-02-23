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
| 1 | departement_code | x 1.66 | 55.9% (76) | 33.7% (23) |
| 2 | densite_grid_7 | x 1.56 | 56.5% (Q2) | 36.2% (Q10) |
| 3 | dvg_total_transactions_2019_2024 | x 1.54 | 56.3% (Q10) | 36.5% (Q1) |
| 4 | population_2022 | x 1.52 | 55.6% (Q10) | 36.6% (Q1) |
| 5 | densite_label_7 | x 1.51 | 53.6% (Grands centres urbains) | 35.5% (Rural à habitat très dispersé) |

---

## Detail par feature

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


### densite_grid_7

*Type: continuous | Impact: x 1.56*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 240,487 | 50.9% | x 1.09 |
| Q2: 1-1 | 240,487 | 56.5% | x 1.21 |
| Q3: 1-2 | 240,487 | 52.3% | x 1.12 |
| Q4: 2-3 | 240,487 | 52.1% | x 1.12 |
| Q5: 3-4 | 240,486 | 47.4% | x 1.01 |
| Q6: 4-5 | 240,486 | 45.4% | x 0.97 |
| Q7: 5-5 | 240,486 | 44.3% | x 0.95 |
| Q8: 5-6 | 240,486 | 41.1% | x 0.88 |
| Q9: 6-6 | 240,486 | 38.7% | x 0.83 |
| Q10: 6-7 | 240,486 | 36.2% | x 0.77 |


### dvg_total_transactions_2019_2024

*Type: continuous | Impact: x 1.54*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-32 | 218,387 | 36.5% | x 0.78 |
| Q2: 32-69 | 218,386 | 38.6% | x 0.83 |
| Q3: 69-127 | 218,386 | 40.8% | x 0.87 |
| Q4: 127-234 | 218,386 | 42.8% | x 0.92 |
| Q5: 234-425 | 218,386 | 45.4% | x 0.97 |
| Q6: 425-842 | 218,386 | 47.5% | x 1.02 |
| Q7: 842-1682 | 218,386 | 49.7% | x 1.06 |
| Q8: 1682-3600 | 218,386 | 51.6% | x 1.10 |
| Q9: 3600-10572 | 218,386 | 53.7% | x 1.15 |
| Q10: 10572-50510 | 218,386 | 56.3% | x 1.21 |


### population_2022

*Type: continuous | Impact: x 1.52*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-417 | 240,487 | 36.6% | x 0.78 |
| Q2: 417-901 | 240,487 | 39.0% | x 0.83 |
| Q3: 901-1692 | 240,487 | 40.9% | x 0.88 |
| Q4: 1692-3137 | 240,487 | 43.4% | x 0.93 |
| Q5: 3137-5694 | 240,486 | 45.8% | x 0.98 |
| Q6: 5694-10740 | 240,486 | 48.4% | x 1.04 |
| Q7: 10740-21433 | 240,486 | 49.9% | x 1.07 |
| Q8: 21433-44529 | 240,486 | 52.2% | x 1.12 |
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


### pct_pop_rural

*Type: continuous | Impact: x 1.47*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -0-0 | 240,487 | 52.0% | x 1.11 |
| Q2: 0-1 | 240,487 | 55.1% | x 1.18 |
| Q3: 1-3 | 240,487 | 52.8% | x 1.13 |
| Q4: 3-7 | 240,487 | 51.1% | x 1.09 |
| Q5: 7-20 | 240,486 | 48.5% | x 1.04 |
| Q6: 20-100 | 240,486 | 44.4% | x 0.95 |
| Q7: 100-100 | 240,486 | 41.4% | x 0.89 |
| Q8: 100-100 | 240,486 | 42.1% | x 0.90 |
| Q9: 100-100 | 240,486 | 37.5% | x 0.80 |
| Q10: 100-100 | 240,486 | 39.9% | x 0.85 |


### niveau_loyer

*Type: categorical | Impact: x 1.41*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Élevé | 487,167 | 51.1% | x 1.09 |
| Très élevé | 330,832 | 48.2% | x 1.03 |
| Moyen | 963,386 | 47.3% | x 1.01 |
| Modéré | 609,972 | 40.0% | x 0.86 |
| Faible | 2,750 | 36.3% | x 0.78 |


### densite_grid

*Type: continuous | Impact: x 1.41*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 1-1 | 240,487 | 55.5% | x 1.19 |
| Q2: 1-1 | 240,487 | 51.2% | x 1.10 |
| Q3: 1-2 | 240,487 | 52.0% | x 1.11 |
| Q4: 2-2 | 240,487 | 51.2% | x 1.10 |
| Q5: 2-2 | 240,486 | 46.0% | x 0.99 |
| Q6: 2-3 | 240,486 | 48.0% | x 1.03 |
| Q7: 3-3 | 240,486 | 41.8% | x 0.89 |
| Q8: 3-3 | 240,486 | 40.0% | x 0.86 |
| Q9: 3-3 | 240,486 | 39.3% | x 0.84 |
| Q10: 3-3 | 240,486 | 39.6% | x 0.85 |


### pct_pop_urbain_dense

*Type: continuous | Impact: x 1.40*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 240,487 | 46.7% | x 1.00 |
| Q2: 0-0 | 240,487 | 45.4% | x 0.97 |
| Q3: 0-0 | 240,487 | 42.7% | x 0.91 |
| Q4: 0-0 | 240,487 | 46.5% | x 1.00 |
| Q5: 0-0 | 240,486 | 45.1% | x 0.96 |
| Q6: 0-0 | 240,486 | 39.3% | x 0.84 |
| Q7: 0-0 | 240,486 | 41.8% | x 0.89 |
| Q8: 0-88 | 240,486 | 49.8% | x 1.07 |
| Q9: 88-99 | 240,486 | 54.9% | x 1.18 |
| Q10: 99-100 | 240,486 | 52.5% | x 1.12 |


### dvg_marche_dynamisme

*Type: categorical | Impact: x 1.38*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Très dynamique | 1,616,394 | 49.1% | x 1.05 |
| Dynamique | 368,964 | 39.1% | x 0.84 |
| Modéré | 157,616 | 36.6% | x 0.78 |
| Faible | 40,887 | 35.6% | x 0.76 |


### loyer_predit_m2

*Type: continuous | Impact: x 1.37*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 5-8 | 239,411 | 37.3% | x 0.80 |
| Q2: 8-9 | 239,411 | 40.7% | x 0.87 |
| Q3: 9-9 | 239,411 | 43.7% | x 0.94 |
| Q4: 9-10 | 239,411 | 45.8% | x 0.98 |
| Q5: 10-11 | 239,411 | 47.5% | x 1.02 |
| Q6: 11-11 | 239,411 | 48.8% | x 1.04 |
| Q7: 11-12 | 239,411 | 51.1% | x 1.09 |
| Q8: 12-14 | 239,410 | 50.1% | x 1.07 |
| Q9: 14-16 | 239,410 | 50.7% | x 1.09 |
| Q10: 16-31 | 239,410 | 48.0% | x 1.03 |


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
| Q6: 1-1 | 239,402 | 47.6% | x 1.02 |
| Q7: 1-2 | 239,402 | 49.7% | x 1.06 |
| Q8: 2-2 | 239,402 | 49.6% | x 1.06 |
| Q9: 2-3 | 239,402 | 50.8% | x 1.09 |
| Q10: 3-36 | 239,402 | 52.0% | x 1.11 |


### loyer_type_prediction

*Type: categorical | Impact: x 1.28*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| commune | 1,563,189 | 50.2% | x 1.07 |
| EPCI | 956 | 41.0% | x 0.88 |
| maille | 829,962 | 39.1% | x 0.84 |


### dvg_evolution_prix_m2_2019_2023_pct

*Type: continuous | Impact: x 1.27*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -90-4 | 213,448 | 40.4% | x 0.87 |
| Q2: 4-11 | 213,448 | 46.3% | x 0.99 |
| Q3: 11-15 | 213,448 | 48.3% | x 1.03 |
| Q4: 15-19 | 213,448 | 48.4% | x 1.04 |
| Q5: 19-21 | 213,448 | 51.2% | x 1.10 |
| Q6: 21-25 | 213,448 | 49.5% | x 1.06 |
| Q7: 25-29 | 213,448 | 48.5% | x 1.04 |
| Q8: 29-36 | 213,448 | 47.4% | x 1.01 |
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


### taux_tfb

*Type: continuous | Impact: x 1.20*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 4-32 | 240,466 | 44.8% | x 0.96 |
| Q2: 32-36 | 240,466 | 42.7% | x 0.91 |
| Q3: 36-39 | 240,466 | 43.2% | x 0.93 |
| Q4: 39-42 | 240,466 | 43.7% | x 0.94 |
| Q5: 42-44 | 240,466 | 45.0% | x 0.96 |
| Q6: 44-46 | 240,465 | 47.6% | x 1.02 |
| Q7: 46-49 | 240,465 | 47.8% | x 1.02 |
| Q8: 49-52 | 240,465 | 49.7% | x 1.06 |
| Q9: 52-56 | 240,465 | 51.4% | x 1.10 |
| Q10: 56-107 | 240,465 | 48.7% | x 1.04 |


### population_growth_rate_annual

*Type: continuous | Impact: x 1.19*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: -20--1 | 239,408 | 41.6% | x 0.89 |
| Q2: -1--1 | 239,408 | 43.6% | x 0.93 |
| Q3: -1--0 | 239,408 | 46.1% | x 0.99 |
| Q4: -0--0 | 239,408 | 46.8% | x 1.00 |
| Q5: -0-0 | 239,407 | 47.5% | x 1.02 |
| Q6: 0-0 | 239,407 | 48.0% | x 1.03 |
| Q7: 0-1 | 239,407 | 48.7% | x 1.04 |
| Q8: 1-1 | 239,407 | 46.7% | x 1.00 |
| Q9: 1-2 | 239,407 | 49.4% | x 1.06 |
| Q10: 2-94 | 239,407 | 45.1% | x 0.97 |


### loyer_confiance_prediction

*Type: categorical | Impact: x 1.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Faible | 1,802,940 | 48.2% | x 1.03 |
| Moyenne | 591,167 | 40.7% | x 0.87 |


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


### pression_fiscale_tfb_teom

*Type: continuous | Impact: x 1.15*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 16-38 | 240,466 | 43.2% | x 0.93 |
| Q2: 38-43 | 240,466 | 43.3% | x 0.93 |
| Q3: 43-47 | 240,466 | 43.6% | x 0.93 |
| Q4: 47-51 | 240,466 | 45.5% | x 0.97 |
| Q5: 51-54 | 240,466 | 45.1% | x 0.97 |
| Q6: 54-57 | 240,465 | 47.6% | x 1.02 |
| Q7: 57-60 | 240,465 | 48.7% | x 1.04 |
| Q8: 60-64 | 240,465 | 49.6% | x 1.06 |
| Q9: 64-69 | 240,465 | 48.9% | x 1.05 |
| Q10: 69-124 | 240,465 | 49.2% | x 1.05 |


### ort_signed

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| ORT signe | 774,429 | 50.4% | x 1.08 |
| Sans ORT | 1,755,301 | 45.1% | x 0.97 |


### is_population_declining

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Population stable/croissante | 1,402,308 | 47.6% | x 1.02 |
| Population en declin | 1,002,556 | 44.8% | x 0.96 |


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

