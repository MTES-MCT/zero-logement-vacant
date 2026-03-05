# ZLV Usage - Stratifie par Action Coeur de Ville

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
| 1 | epci_campagnes_creees | continuous | x 1.59 | 62.4% (Q1: 0-0) | 39.2% (Q5: 0-0) |
| 2 | epci_logements_contactes_via_campagnes | continuous | x 1.52 | 60.3% (Q1: 0-0) | 39.7% (Q5: 0-0) |
| 3 | epci_logements_maj_situation | continuous | x 1.47 | 57.9% (Q5: 2-6) | 39.4% (Q3: 0-0) |
| 4 | epci_campagnes_envoyees | continuous | x 1.45 | 62.8% (Q1: 0-0) | 43.3% (Q5: 0-0) |
| 5 | city_groupes_crees | continuous | x 1.35 | 62.9% (Q2: 0-0) | 46.6% (Q6: 0-0) |

### Detail par feature

#### epci_campagnes_creees

*Type: continuous | Impact: x 1.59*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 62.4% | x 1.33 | x 1.16 |
| Q2: 0-0 | 38,731 | 55.3% | x 1.18 | x 1.03 |
| Q3: 0-0 | 38,731 | 47.8% | x 1.02 | x 0.89 |
| Q4: 0-0 | 38,731 | 58.3% | x 1.25 | x 1.09 |
| Q5: 0-0 | 38,731 | 39.2% | x 0.84 | x 0.73 |
| Q6: 0-1 | 38,731 | 56.8% | x 1.21 | x 1.06 |
| Q7: 1-2 | 38,731 | 49.5% | x 1.06 | x 0.92 |
| Q8: 2-3 | 38,731 | 55.0% | x 1.18 | x 1.02 |
| Q9: 3-7 | 38,731 | 55.2% | x 1.18 | x 1.03 |
| Q10: 7-23 | 38,731 | 57.5% | x 1.23 | x 1.07 |


#### epci_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.52*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 60.3% | x 1.29 | x 1.12 |
| Q2: 0-0 | 38,731 | 55.4% | x 1.19 | x 1.03 |
| Q3: 0-0 | 38,731 | 48.0% | x 1.03 | x 0.89 |
| Q4: 0-0 | 38,731 | 54.6% | x 1.17 | x 1.02 |
| Q5: 0-0 | 38,731 | 39.7% | x 0.85 | x 0.74 |
| Q6: 0-0 | 38,731 | 55.5% | x 1.19 | x 1.03 |
| Q7: 0-4 | 38,731 | 54.9% | x 1.18 | x 1.02 |
| Q8: 4-332 | 38,731 | 55.6% | x 1.19 | x 1.04 |
| Q9: 332-1197 | 38,731 | 56.0% | x 1.20 | x 1.04 |
| Q10: 1197-5013 | 38,731 | 56.9% | x 1.22 | x 1.06 |


#### epci_logements_maj_situation

*Type: continuous | Impact: x 1.47*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 57.4% | x 1.23 | x 1.07 |
| Q2: 0-0 | 38,731 | 56.2% | x 1.20 | x 1.05 |
| Q3: 0-0 | 38,731 | 39.4% | x 0.84 | x 0.73 |
| Q4: 0-2 | 38,731 | 52.4% | x 1.12 | x 0.98 |
| Q5: 2-6 | 38,731 | 57.9% | x 1.24 | x 1.08 |
| Q6: 6-37 | 38,731 | 52.1% | x 1.12 | x 0.97 |
| Q7: 37-124 | 38,731 | 54.4% | x 1.16 | x 1.01 |
| Q8: 124-229 | 38,731 | 55.8% | x 1.19 | x 1.04 |
| Q9: 229-613 | 38,731 | 54.5% | x 1.17 | x 1.01 |
| Q10: 613-3873 | 38,731 | 57.1% | x 1.22 | x 1.06 |


#### epci_campagnes_envoyees

*Type: continuous | Impact: x 1.45*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 62.8% | x 1.35 | x 1.17 |
| Q2: 0-0 | 38,731 | 48.8% | x 1.04 | x 0.91 |
| Q3: 0-0 | 38,731 | 52.2% | x 1.12 | x 0.97 |
| Q4: 0-0 | 38,731 | 53.9% | x 1.15 | x 1.00 |
| Q5: 0-0 | 38,731 | 43.3% | x 0.93 | x 0.81 |
| Q6: 0-0 | 38,731 | 52.0% | x 1.11 | x 0.97 |
| Q7: 0-1 | 38,731 | 54.9% | x 1.18 | x 1.02 |
| Q8: 1-2 | 38,731 | 56.2% | x 1.20 | x 1.05 |
| Q9: 2-4 | 38,731 | 55.2% | x 1.18 | x 1.03 |
| Q10: 4-22 | 38,731 | 57.7% | x 1.24 | x 1.07 |


#### city_groupes_crees

*Type: continuous | Impact: x 1.35*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 51.6% | x 1.11 | x 0.96 |
| Q2: 0-0 | 38,731 | 62.9% | x 1.35 | x 1.17 |
| Q3: 0-0 | 38,731 | 52.2% | x 1.12 | x 0.97 |
| Q4: 0-0 | 38,731 | 52.5% | x 1.12 | x 0.98 |
| Q5: 0-0 | 38,731 | 57.2% | x 1.22 | x 1.07 |
| Q6: 0-0 | 38,731 | 46.6% | x 1.00 | x 0.87 |
| Q7: 0-0 | 38,731 | 56.2% | x 1.20 | x 1.05 |
| Q8: 0-0 | 38,731 | 50.1% | x 1.07 | x 0.93 |
| Q9: 0-1 | 38,731 | 56.0% | x 1.20 | x 1.04 |
| Q10: 1-9 | 38,731 | 51.7% | x 1.11 | x 0.96 |


#### city_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 49.4% | x 1.06 | x 0.92 |
| Q2: 0-0 | 38,731 | 49.7% | x 1.06 | x 0.93 |
| Q3: 0-0 | 38,731 | 56.0% | x 1.20 | x 1.04 |
| Q4: 0-0 | 38,731 | 58.2% | x 1.25 | x 1.08 |
| Q5: 0-0 | 38,731 | 59.7% | x 1.28 | x 1.11 |
| Q6: 0-0 | 38,731 | 46.1% | x 0.99 | x 0.86 |
| Q7: 0-0 | 38,731 | 57.8% | x 1.24 | x 1.08 |
| Q8: 0-0 | 38,731 | 56.0% | x 1.20 | x 1.04 |
| Q9: 0-0 | 38,731 | 50.8% | x 1.09 | x 0.95 |
| Q10: 0-384 | 38,731 | 53.4% | x 1.14 | x 0.99 |


#### city_campagnes_creees

*Type: continuous | Impact: x 1.28*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 56.8% | x 1.22 | x 1.06 |
| Q2: 0-0 | 38,731 | 50.3% | x 1.08 | x 0.94 |
| Q3: 0-0 | 38,731 | 54.4% | x 1.16 | x 1.01 |
| Q4: 0-0 | 38,731 | 58.1% | x 1.24 | x 1.08 |
| Q5: 0-0 | 38,731 | 55.3% | x 1.18 | x 1.03 |
| Q6: 0-0 | 38,731 | 46.6% | x 1.00 | x 0.87 |
| Q7: 0-0 | 38,731 | 59.7% | x 1.28 | x 1.11 |
| Q8: 0-0 | 38,731 | 53.1% | x 1.14 | x 0.99 |
| Q9: 0-1 | 38,731 | 52.4% | x 1.12 | x 0.98 |
| Q10: 1-7 | 38,731 | 50.4% | x 1.08 | x 0.94 |


#### city_logements_maj_situation

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 56.9% | x 1.22 | x 1.06 |
| Q2: 0-0 | 38,731 | 56.4% | x 1.21 | x 1.05 |
| Q3: 0-0 | 38,731 | 49.9% | x 1.07 | x 0.93 |
| Q4: 0-0 | 38,731 | 45.7% | x 0.98 | x 0.85 |
| Q5: 0-0 | 38,731 | 50.3% | x 1.08 | x 0.94 |
| Q6: 0-5 | 38,731 | 55.6% | x 1.19 | x 1.04 |
| Q7: 5-37 | 38,731 | 54.1% | x 1.16 | x 1.01 |
| Q8: 37-145 | 38,731 | 56.5% | x 1.21 | x 1.05 |
| Q9: 145-380 | 38,731 | 55.2% | x 1.18 | x 1.03 |
| Q10: 380-1603 | 38,731 | 56.3% | x 1.21 | x 1.05 |


#### city_campagnes_envoyees

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 56.6% | x 1.21 | x 1.05 |
| Q2: 0-0 | 38,731 | 55.0% | x 1.18 | x 1.02 |
| Q3: 0-0 | 38,731 | 48.4% | x 1.04 | x 0.90 |
| Q4: 0-0 | 38,731 | 55.2% | x 1.18 | x 1.03 |
| Q5: 0-0 | 38,731 | 56.5% | x 1.21 | x 1.05 |
| Q6: 0-0 | 38,731 | 46.9% | x 1.00 | x 0.87 |
| Q7: 0-0 | 38,731 | 58.4% | x 1.25 | x 1.09 |
| Q8: 0-0 | 38,731 | 53.3% | x 1.14 | x 0.99 |
| Q9: 0-0 | 38,731 | 56.2% | x 1.20 | x 1.05 |
| Q10: 0-6 | 38,731 | 50.4% | x 1.08 | x 0.94 |


#### city_utilisateurs_inscrits

*Type: continuous | Impact: x 1.20*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 58.4% | x 1.25 | x 1.09 |
| Q2: 0-0 | 38,731 | 50.6% | x 1.08 | x 0.94 |
| Q3: 0-0 | 38,731 | 57.4% | x 1.23 | x 1.07 |
| Q4: 0-0 | 38,731 | 56.6% | x 1.21 | x 1.05 |
| Q5: 0-0 | 38,731 | 48.6% | x 1.04 | x 0.91 |
| Q6: 0-0 | 38,731 | 53.0% | x 1.14 | x 0.99 |
| Q7: 0-1 | 38,731 | 54.3% | x 1.16 | x 1.01 |
| Q8: 1-1 | 38,731 | 51.8% | x 1.11 | x 0.97 |
| Q9: 1-2 | 38,731 | 53.1% | x 1.14 | x 0.99 |
| Q10: 2-4 | 38,731 | 53.2% | x 1.14 | x 0.99 |


#### epci_groupes_crees

*Type: continuous | Impact: x 1.19*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 58.9% | x 1.26 | x 1.10 |
| Q2: 0-0 | 38,731 | 49.4% | x 1.06 | x 0.92 |
| Q3: 0-1 | 38,731 | 50.7% | x 1.09 | x 0.94 |
| Q4: 1-1 | 38,731 | 50.6% | x 1.08 | x 0.94 |
| Q5: 1-2 | 38,731 | 57.4% | x 1.23 | x 1.07 |
| Q6: 2-3 | 38,731 | 54.8% | x 1.17 | x 1.02 |
| Q7: 3-5 | 38,731 | 54.5% | x 1.17 | x 1.02 |
| Q8: 5-8 | 38,731 | 51.9% | x 1.11 | x 0.97 |
| Q9: 8-15 | 38,731 | 54.4% | x 1.16 | x 1.01 |
| Q10: 15-89 | 38,731 | 54.3% | x 1.16 | x 1.01 |


#### epci_utilisateurs_inscrits

*Type: continuous | Impact: x 1.17*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 38,731 | 52.4% | x 1.12 | x 0.98 |
| Q2: 0-1 | 38,731 | 50.7% | x 1.09 | x 0.94 |
| Q3: 1-1 | 38,731 | 54.3% | x 1.16 | x 1.01 |
| Q4: 1-2 | 38,731 | 55.4% | x 1.19 | x 1.03 |
| Q5: 2-2 | 38,731 | 55.0% | x 1.18 | x 1.02 |
| Q6: 2-2 | 38,731 | 50.7% | x 1.09 | x 0.94 |
| Q7: 2-3 | 38,731 | 53.7% | x 1.15 | x 1.00 |
| Q8: 3-4 | 38,731 | 56.8% | x 1.22 | x 1.06 |
| Q9: 4-5 | 38,731 | 58.1% | x 1.24 | x 1.08 |
| Q10: 5-11 | 38,731 | 49.8% | x 1.07 | x 0.93 |


#### epci_type_detaille

*Type: categorical | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Communauté Urbaine | 37,139 | 56.6% | x 1.21 | x 1.05 |
| Communauté d'Agglomération | 306,185 | 53.9% | x 1.15 | x 1.00 |
| Communauté des Communes | 43,986 | 50.1% | x 1.07 | x 0.93 |


#### city_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ suivi | 178,013 | 56.1% | x 1.20 | x 1.04 |
| Commune sans MAJ suivi | 209,297 | 51.7% | x 1.11 | x 0.96 |


#### epci_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ suivi | 235,371 | 55.3% | x 1.18 | x 1.03 |
| EPCI sans MAJ suivi | 151,939 | 51.3% | x 1.10 | x 0.95 |


#### epci_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a envoye campagne | 118,762 | 56.5% | x 1.21 | x 1.05 |
| EPCI pas de campagne envoyee | 268,548 | 52.5% | x 1.12 | x 0.98 |


#### epci_a_1_campagne_envoyee_et_1_maj_situation

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI campagne+MAJ | 118,762 | 56.5% | x 1.21 | x 1.05 |
| EPCI sans campagne+MAJ | 268,548 | 52.5% | x 1.12 | x 0.98 |


#### city_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ situation | 185,027 | 55.8% | x 1.20 | x 1.04 |
| Commune sans MAJ situation | 202,283 | 51.8% | x 1.11 | x 0.96 |


#### epci_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ situation | 249,129 | 55.0% | x 1.18 | x 1.02 |
| EPCI sans MAJ situation | 138,181 | 51.4% | x 1.10 | x 0.96 |


#### city_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ occupation | 148,371 | 56.0% | x 1.20 | x 1.04 |
| Commune sans MAJ occupation | 238,939 | 52.3% | x 1.12 | x 0.97 |


#### city_a_1_campagne_creee

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune pas de campagne | 341,289 | 54.1% | x 1.16 | x 1.01 |
| Commune a cree campagne | 46,021 | 50.5% | x 1.08 | x 0.94 |


#### epci_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ occupation | 214,024 | 55.1% | x 1.18 | x 1.03 |
| EPCI sans MAJ occupation | 173,286 | 52.0% | x 1.11 | x 0.97 |


#### city_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune pas de campagne envoyee | 356,411 | 53.9% | x 1.15 | x 1.00 |
| Commune a envoye campagne | 30,899 | 50.9% | x 1.09 | x 0.95 |


#### epci_ouvert

*Type: boolean | Impact: x 1.04*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI ouvert sur ZLV | 339,798 | 54.0% | x 1.16 | x 1.00 |
| EPCI non ouvert | 47,512 | 51.9% | x 1.11 | x 0.97 |


#### epci_a_1_campagne_creee

*Type: boolean | Impact: x 1.04*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a cree campagne | 173,653 | 54.8% | x 1.17 | x 1.02 |
| EPCI pas de campagne | 213,657 | 52.8% | x 1.13 | x 0.98 |


#### city_a_1_groupe_cree

*Type: boolean | Impact: x 1.03*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune pas de groupe | 319,969 | 54.0% | x 1.15 | x 1.00 |
| Commune a cree groupe | 67,341 | 52.5% | x 1.12 | x 0.98 |


#### epci_connecte_90_jours

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 90j | 266,202 | 54.1% | x 1.16 | x 1.01 |
| EPCI non connecte 90j | 121,108 | 52.9% | x 1.13 | x 0.99 |


#### epci_connecte_60_jours

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 60j | 257,624 | 54.1% | x 1.16 | x 1.01 |
| EPCI non connecte 60j | 129,686 | 52.9% | x 1.13 | x 0.98 |


#### epci_connecte_30_jours

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 30j | 229,767 | 54.1% | x 1.16 | x 1.01 |
| EPCI non connecte 30j | 157,543 | 53.1% | x 1.14 | x 0.99 |


#### epci_a_1_groupe_cree

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a cree groupe | 280,004 | 54.0% | x 1.16 | x 1.01 |
| EPCI pas de groupe | 107,306 | 52.8% | x 1.13 | x 0.98 |


#### city_ouvert

*Type: boolean | Impact: x 1.02*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune non ouverte | 256,618 | 54.1% | x 1.16 | x 1.01 |
| Commune ouverte sur ZLV | 130,692 | 52.9% | x 1.13 | x 0.99 |


#### city_connecte_90_jours

*Type: boolean | Impact: x 1.01*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune non connectee 90j | 326,060 | 53.8% | x 1.15 | x 1.00 |
| Commune connectee 90j | 61,250 | 53.3% | x 1.14 | x 0.99 |


#### city_connecte_60_jours

*Type: boolean | Impact: x 1.01*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune non connectee 60j | 330,234 | 53.8% | x 1.15 | x 1.00 |
| Commune connectee 60j | 57,076 | 53.2% | x 1.14 | x 0.99 |


#### city_a_1_perimetre_importe

*Type: boolean | Impact: x 1.01*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune pas de perimetre | 350,792 | 53.8% | x 1.15 | x 1.00 |
| Commune a importe perimetre | 36,518 | 53.1% | x 1.14 | x 0.99 |


#### epci_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Intercommunalité | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### city_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### city_type_detaille

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune | 387,310 | 53.7% | x 1.15 | x 1.00 |


#### epci_a_1_perimetre_importe

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI pas de perimetre | 227,512 | 53.8% | x 1.15 | x 1.00 |
| EPCI a importe perimetre | 159,798 | 53.6% | x 1.15 | x 1.00 |


#### city_connecte_30_jours

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune connectee 30j | 38,404 | 53.9% | x 1.15 | x 1.00 |
| Commune non connectee 30j | 348,906 | 53.7% | x 1.15 | x 1.00 |


---

## Strate: action_coeur_de_ville = Hors ACV

- **N**: 2,142,420
- **Taux de sortie strate**: 45.45%
- **Taux de sortie global**: 46.71%

### Top facteurs

| Rang | Feature | Type | Impact | Taux max | Taux min |
|------|---------|------|--------|----------|----------|
| 1 | epci_logements_contactes_via_campagnes | continuous | x 1.30 | 51.4% (Q8: 0-68) | 39.6% (Q5: 0-0) |
| 2 | city_groupes_crees | continuous | x 1.29 | 51.3% (Q10: 0-15) | 39.8% (Q7: 0-0) |
| 3 | epci_type_detaille | categorical | x 1.25 | 52.4% (Communauté Urbaine) | 41.9% (Communauté des Communes) |
| 4 | city_logements_maj_situation | continuous | x 1.25 | 51.7% (Q10: 35-8138) | 41.4% (Q7: 0-0) |
| 5 | epci_utilisateurs_inscrits | continuous | x 1.24 | 50.7% (Q10: 7-17) | 40.8% (Q1: 0-0) |

### Detail par feature

#### epci_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.30*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 47.1% | x 1.01 | x 1.04 |
| Q2: 0-0 | 214,242 | 46.3% | x 0.99 | x 1.02 |
| Q3: 0-0 | 214,242 | 40.6% | x 0.87 | x 0.89 |
| Q4: 0-0 | 214,242 | 45.1% | x 0.97 | x 0.99 |
| Q5: 0-0 | 214,242 | 39.6% | x 0.85 | x 0.87 |
| Q6: 0-0 | 214,242 | 46.8% | x 1.00 | x 1.03 |
| Q7: 0-0 | 214,242 | 41.1% | x 0.88 | x 0.91 |
| Q8: 0-68 | 214,242 | 51.4% | x 1.10 | x 1.13 |
| Q9: 68-1241 | 214,242 | 45.6% | x 0.98 | x 1.00 |
| Q10: 1241-15314 | 214,242 | 50.8% | x 1.09 | x 1.12 |


#### city_groupes_crees

*Type: continuous | Impact: x 1.29*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 46.2% | x 0.99 | x 1.02 |
| Q2: 0-0 | 214,242 | 46.8% | x 1.00 | x 1.03 |
| Q3: 0-0 | 214,242 | 45.1% | x 0.97 | x 0.99 |
| Q4: 0-0 | 214,242 | 43.9% | x 0.94 | x 0.97 |
| Q5: 0-0 | 214,242 | 40.9% | x 0.87 | x 0.90 |
| Q6: 0-0 | 214,242 | 45.0% | x 0.96 | x 0.99 |
| Q7: 0-0 | 214,242 | 39.8% | x 0.85 | x 0.88 |
| Q8: 0-0 | 214,242 | 45.4% | x 0.97 | x 1.00 |
| Q9: 0-0 | 214,242 | 49.9% | x 1.07 | x 1.10 |
| Q10: 0-15 | 214,242 | 51.3% | x 1.10 | x 1.13 |


#### epci_type_detaille

*Type: categorical | Impact: x 1.25*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Communauté Urbaine | 54,345 | 52.4% | x 1.12 | x 1.15 |
| Métropole | 511,484 | 51.9% | x 1.11 | x 1.14 |
| Communauté d'Agglomération | 531,305 | 45.6% | x 0.98 | x 1.00 |
| Communauté des Communes | 1,044,776 | 41.9% | x 0.90 | x 0.92 |


#### city_logements_maj_situation

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 41.8% | x 0.89 | x 0.92 |
| Q2: 0-0 | 214,242 | 48.2% | x 1.03 | x 1.06 |
| Q3: 0-0 | 214,242 | 44.1% | x 0.94 | x 0.97 |
| Q4: 0-0 | 214,242 | 43.5% | x 0.93 | x 0.96 |
| Q5: 0-0 | 214,242 | 44.0% | x 0.94 | x 0.97 |
| Q6: 0-0 | 214,242 | 43.4% | x 0.93 | x 0.96 |
| Q7: 0-0 | 214,242 | 41.4% | x 0.89 | x 0.91 |
| Q8: 0-0 | 214,242 | 47.3% | x 1.01 | x 1.04 |
| Q9: 0-35 | 214,242 | 49.1% | x 1.05 | x 1.08 |
| Q10: 35-8138 | 214,242 | 51.7% | x 1.11 | x 1.14 |


#### epci_utilisateurs_inscrits

*Type: continuous | Impact: x 1.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 40.8% | x 0.87 | x 0.90 |
| Q2: 0-0 | 214,242 | 45.6% | x 0.98 | x 1.00 |
| Q3: 0-1 | 214,242 | 41.5% | x 0.89 | x 0.91 |
| Q4: 1-1 | 214,242 | 42.2% | x 0.90 | x 0.93 |
| Q5: 1-2 | 214,242 | 46.2% | x 0.99 | x 1.02 |
| Q6: 2-2 | 214,242 | 45.5% | x 0.97 | x 1.00 |
| Q7: 2-2 | 214,242 | 46.8% | x 1.00 | x 1.03 |
| Q8: 2-3 | 214,242 | 47.8% | x 1.02 | x 1.05 |
| Q9: 3-7 | 214,242 | 47.4% | x 1.02 | x 1.04 |
| Q10: 7-17 | 214,242 | 50.7% | x 1.09 | x 1.12 |


#### epci_groupes_crees

*Type: continuous | Impact: x 1.24*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 50.1% | x 1.07 | x 1.10 |
| Q2: 0-0 | 214,242 | 44.3% | x 0.95 | x 0.97 |
| Q3: 0-0 | 214,242 | 40.6% | x 0.87 | x 0.89 |
| Q4: 0-0 | 214,242 | 41.3% | x 0.88 | x 0.91 |
| Q5: 0-0 | 214,242 | 45.5% | x 0.97 | x 1.00 |
| Q6: 0-1 | 214,242 | 45.7% | x 0.98 | x 1.01 |
| Q7: 1-2 | 214,242 | 46.8% | x 1.00 | x 1.03 |
| Q8: 2-4 | 214,242 | 47.6% | x 1.02 | x 1.05 |
| Q9: 4-12 | 214,242 | 44.6% | x 0.96 | x 0.98 |
| Q10: 12-94 | 214,242 | 48.0% | x 1.03 | x 1.06 |


#### city_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.23*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 42.6% | x 0.91 | x 0.94 |
| Q2: 0-0 | 214,242 | 42.1% | x 0.90 | x 0.93 |
| Q3: 0-0 | 214,242 | 43.8% | x 0.94 | x 0.96 |
| Q4: 0-0 | 214,242 | 41.4% | x 0.89 | x 0.91 |
| Q5: 0-0 | 214,242 | 51.1% | x 1.09 | x 1.12 |
| Q6: 0-0 | 214,242 | 44.9% | x 0.96 | x 0.99 |
| Q7: 0-0 | 214,242 | 46.3% | x 0.99 | x 1.02 |
| Q8: 0-0 | 214,242 | 50.5% | x 1.08 | x 1.11 |
| Q9: 0-0 | 214,242 | 42.5% | x 0.91 | x 0.93 |
| Q10: 0-3188 | 214,242 | 49.3% | x 1.05 | x 1.08 |


#### city_utilisateurs_inscrits

*Type: continuous | Impact: x 1.21*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 46.0% | x 0.98 | x 1.01 |
| Q2: 0-0 | 214,242 | 45.9% | x 0.98 | x 1.01 |
| Q3: 0-0 | 214,242 | 41.5% | x 0.89 | x 0.91 |
| Q4: 0-0 | 214,242 | 47.0% | x 1.01 | x 1.03 |
| Q5: 0-0 | 214,242 | 42.8% | x 0.92 | x 0.94 |
| Q6: 0-0 | 214,242 | 43.5% | x 0.93 | x 0.96 |
| Q7: 0-0 | 214,242 | 43.0% | x 0.92 | x 0.95 |
| Q8: 0-0 | 214,242 | 49.1% | x 1.05 | x 1.08 |
| Q9: 0-0 | 214,242 | 45.4% | x 0.97 | x 1.00 |
| Q10: 0-6 | 214,242 | 50.1% | x 1.07 | x 1.10 |


#### epci_campagnes_envoyees

*Type: continuous | Impact: x 1.20*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 49.1% | x 1.05 | x 1.08 |
| Q2: 0-0 | 214,242 | 41.9% | x 0.90 | x 0.92 |
| Q3: 0-0 | 214,242 | 43.9% | x 0.94 | x 0.97 |
| Q4: 0-0 | 214,242 | 43.5% | x 0.93 | x 0.96 |
| Q5: 0-0 | 214,242 | 41.1% | x 0.88 | x 0.90 |
| Q6: 0-0 | 214,242 | 46.0% | x 0.98 | x 1.01 |
| Q7: 0-0 | 214,242 | 46.8% | x 1.00 | x 1.03 |
| Q8: 0-1 | 214,242 | 44.5% | x 0.95 | x 0.98 |
| Q9: 1-5 | 214,242 | 48.4% | x 1.04 | x 1.07 |
| Q10: 5-56 | 214,242 | 49.3% | x 1.05 | x 1.08 |


#### epci_logements_maj_situation

*Type: continuous | Impact: x 1.19*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 43.0% | x 0.92 | x 0.95 |
| Q2: 0-0 | 214,242 | 47.2% | x 1.01 | x 1.04 |
| Q3: 0-0 | 214,242 | 41.8% | x 0.90 | x 0.92 |
| Q4: 0-0 | 214,242 | 41.9% | x 0.90 | x 0.92 |
| Q5: 0-3 | 214,242 | 45.7% | x 0.98 | x 1.01 |
| Q6: 3-40 | 214,242 | 45.1% | x 0.97 | x 0.99 |
| Q7: 40-159 | 214,242 | 44.4% | x 0.95 | x 0.98 |
| Q8: 159-551 | 214,242 | 47.9% | x 1.03 | x 1.05 |
| Q9: 551-877 | 214,242 | 47.5% | x 1.02 | x 1.05 |
| Q10: 877-10491 | 214,242 | 49.8% | x 1.07 | x 1.10 |


#### city_campagnes_envoyees

*Type: continuous | Impact: x 1.17*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 44.0% | x 0.94 | x 0.97 |
| Q2: 0-0 | 214,242 | 41.8% | x 0.90 | x 0.92 |
| Q3: 0-0 | 214,242 | 44.6% | x 0.95 | x 0.98 |
| Q4: 0-0 | 214,242 | 44.8% | x 0.96 | x 0.99 |
| Q5: 0-0 | 214,242 | 48.6% | x 1.04 | x 1.07 |
| Q6: 0-0 | 214,242 | 44.1% | x 0.94 | x 0.97 |
| Q7: 0-0 | 214,242 | 49.0% | x 1.05 | x 1.08 |
| Q8: 0-0 | 214,242 | 47.5% | x 1.02 | x 1.05 |
| Q9: 0-0 | 214,242 | 46.7% | x 1.00 | x 1.03 |
| Q10: 0-7 | 214,242 | 43.4% | x 0.93 | x 0.95 |


#### epci_campagnes_creees

*Type: continuous | Impact: x 1.16*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 48.6% | x 1.04 | x 1.07 |
| Q2: 0-0 | 214,242 | 44.2% | x 0.95 | x 0.97 |
| Q3: 0-0 | 214,242 | 42.9% | x 0.92 | x 0.94 |
| Q4: 0-0 | 214,242 | 42.8% | x 0.92 | x 0.94 |
| Q5: 0-0 | 214,242 | 42.4% | x 0.91 | x 0.93 |
| Q6: 0-0 | 214,242 | 46.6% | x 1.00 | x 1.03 |
| Q7: 0-1 | 214,242 | 42.9% | x 0.92 | x 0.94 |
| Q8: 1-2 | 214,242 | 48.4% | x 1.04 | x 1.07 |
| Q9: 2-7 | 214,242 | 46.4% | x 0.99 | x 1.02 |
| Q10: 7-56 | 214,242 | 49.3% | x 1.05 | x 1.08 |


#### city_connecte_90_jours

*Type: boolean | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune connectee 90j | 121,946 | 51.1% | x 1.09 | x 1.12 |
| Commune non connectee 90j | 2,020,474 | 45.1% | x 0.97 | x 0.99 |


#### city_campagnes_creees

*Type: continuous | Impact: x 1.13*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Q1: 0-0 | 214,242 | 45.0% | x 0.96 | x 0.99 |
| Q2: 0-0 | 214,242 | 43.2% | x 0.92 | x 0.95 |
| Q3: 0-0 | 214,242 | 45.1% | x 0.97 | x 0.99 |
| Q4: 0-0 | 214,242 | 44.1% | x 0.94 | x 0.97 |
| Q5: 0-0 | 214,242 | 45.8% | x 0.98 | x 1.01 |
| Q6: 0-0 | 214,242 | 42.4% | x 0.91 | x 0.93 |
| Q7: 0-0 | 214,242 | 47.9% | x 1.02 | x 1.05 |
| Q8: 0-0 | 214,242 | 47.0% | x 1.01 | x 1.03 |
| Q9: 0-0 | 214,242 | 47.3% | x 1.01 | x 1.04 |
| Q10: 0-11 | 214,242 | 46.7% | x 1.00 | x 1.03 |


#### city_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ occupation | 322,356 | 49.9% | x 1.07 | x 1.10 |
| Commune sans MAJ occupation | 1,820,064 | 44.7% | x 0.96 | x 0.98 |


#### city_a_1_campagne_creee

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a cree campagne | 56,667 | 50.7% | x 1.09 | x 1.12 |
| Commune pas de campagne | 2,085,753 | 45.3% | x 0.97 | x 1.00 |


#### city_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a envoye campagne | 29,239 | 50.6% | x 1.08 | x 1.11 |
| Commune pas de campagne envoyee | 2,113,181 | 45.4% | x 0.97 | x 1.00 |


#### city_ouvert

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune ouverte sur ZLV | 211,515 | 49.6% | x 1.06 | x 1.09 |
| Commune non ouverte | 1,854,767 | 44.7% | x 0.96 | x 0.98 |


#### city_connecte_60_jours

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune connectee 60j | 106,615 | 50.0% | x 1.07 | x 1.10 |
| Commune non connectee 60j | 2,035,805 | 45.2% | x 0.97 | x 0.99 |


#### city_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ situation | 417,280 | 49.3% | x 1.05 | x 1.08 |
| Commune sans MAJ situation | 1,725,140 | 44.5% | x 0.95 | x 0.98 |


#### city_a_1_groupe_cree

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a cree groupe | 117,609 | 50.0% | x 1.07 | x 1.10 |
| Commune pas de groupe | 2,024,811 | 45.2% | x 0.97 | x 0.99 |


#### city_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a MAJ suivi | 391,372 | 49.1% | x 1.05 | x 1.08 |
| Commune sans MAJ suivi | 1,751,048 | 44.6% | x 0.96 | x 0.98 |


#### epci_ouvert

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI ouvert sur ZLV | 1,534,123 | 46.6% | x 1.00 | x 1.02 |
| EPCI non ouvert | 607,787 | 42.7% | x 0.91 | x 0.94 |


#### city_connecte_30_jours

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune connectee 30j | 89,187 | 49.3% | x 1.06 | x 1.08 |
| Commune non connectee 30j | 2,053,233 | 45.3% | x 0.97 | x 1.00 |


#### epci_connecte_90_jours

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 90j | 1,170,329 | 47.1% | x 1.01 | x 1.04 |
| EPCI non connecte 90j | 972,091 | 43.5% | x 0.93 | x 0.96 |


#### epci_connecte_30_jours

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 30j | 1,005,440 | 47.4% | x 1.01 | x 1.04 |
| EPCI non connecte 30j | 1,136,980 | 43.8% | x 0.94 | x 0.96 |


#### epci_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a envoye campagne | 475,712 | 48.2% | x 1.03 | x 1.06 |
| EPCI pas de campagne envoyee | 1,666,708 | 44.7% | x 0.96 | x 0.98 |


#### epci_a_1_campagne_envoyee_et_1_maj_situation

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI campagne+MAJ | 470,671 | 48.2% | x 1.03 | x 1.06 |
| EPCI sans campagne+MAJ | 1,671,749 | 44.7% | x 0.96 | x 0.98 |


#### epci_connecte_60_jours

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI connecte 60j | 1,095,122 | 47.0% | x 1.01 | x 1.04 |
| EPCI non connecte 60j | 1,047,298 | 43.8% | x 0.94 | x 0.96 |


#### epci_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ suivi | 1,118,932 | 46.9% | x 1.00 | x 1.03 |
| EPCI sans MAJ suivi | 1,023,488 | 43.9% | x 0.94 | x 0.97 |


#### city_a_1_perimetre_importe

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune a importe perimetre | 47,263 | 48.6% | x 1.04 | x 1.07 |
| Commune pas de perimetre | 2,095,157 | 45.4% | x 0.97 | x 1.00 |


#### epci_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ situation | 1,186,206 | 46.7% | x 1.00 | x 1.03 |
| EPCI sans MAJ situation | 956,214 | 43.9% | x 0.94 | x 0.97 |


#### epci_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a MAJ occupation | 1,057,105 | 46.8% | x 1.00 | x 1.03 |
| EPCI sans MAJ occupation | 1,085,315 | 44.1% | x 0.94 | x 0.97 |


#### epci_a_1_campagne_creee

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a cree campagne | 745,270 | 47.1% | x 1.01 | x 1.04 |
| EPCI pas de campagne | 1,397,150 | 44.5% | x 0.95 | x 0.98 |


#### epci_a_1_groupe_cree

*Type: boolean | Impact: x 1.05*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a cree groupe | 1,022,405 | 46.5% | x 1.00 | x 1.02 |
| EPCI pas de groupe | 1,120,015 | 44.5% | x 0.95 | x 0.98 |


#### epci_a_1_perimetre_importe

*Type: boolean | Impact: x 1.05*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| EPCI a importe perimetre | 514,434 | 47.3% | x 1.01 | x 1.04 |
| EPCI pas de perimetre | 1,627,986 | 44.9% | x 0.96 | x 0.99 |


#### epci_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Intercommunalité | 2,141,910 | 45.5% | x 0.97 | x 1.00 |


#### city_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune | 2,066,282 | 45.2% | x 0.97 | x 0.99 |


#### city_type_detaille

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | vs global | vs strate |
|----------|---|-------------|-----------|-----------|
| Commune | 2,066,282 | 45.2% | x 0.97 | x 0.99 |


---

## Notes methodologiques

- **Stratification**: Analyse par sous-population definie par action_coeur_de_ville
- **vs global**: Multiplicateur par rapport au taux de sortie global
- **vs strate**: Multiplicateur par rapport au taux de sortie de la strate
- **Seuil minimum**: Modalites avec < 100 observations exclues
