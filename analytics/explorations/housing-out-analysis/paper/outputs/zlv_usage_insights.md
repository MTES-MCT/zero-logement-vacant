# ZLV Usage - Analyse Simple des features

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
| 1 | city_campagnes_envoyees | x 1.36 | 55.9% (Q8) | 41.2% (Q1) |
| 2 | city_groupes_crees | x 1.34 | 56.3% (Q9) | 42.0% (Q5) |
| 3 | city_logements_maj_situation | x 1.31 | 53.9% (Q10) | 41.2% (Q3) |
| 4 | epci_type_detaille | x 1.28 | 54.1% (Communauté Urbaine) | 42.2% (Communauté des Communes) |
| 5 | city_logements_contactes_via_campagnes | x 1.28 | 52.0% (Q5) | 40.5% (Q6) |

---

## Detail par feature

### city_campagnes_envoyees

*Type: continuous | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 41.2% | x 0.88 |
| Q2: 0-0 | 252,973 | 47.3% | x 1.01 |
| Q3: 0-0 | 252,973 | 43.8% | x 0.94 |
| Q4: 0-0 | 252,973 | 46.0% | x 0.99 |
| Q5: 0-0 | 252,973 | 47.4% | x 1.01 |
| Q6: 0-0 | 252,973 | 42.4% | x 0.91 |
| Q7: 0-0 | 252,973 | 48.5% | x 1.04 |
| Q8: 0-0 | 252,973 | 55.9% | x 1.20 |
| Q9: 0-0 | 252,973 | 46.3% | x 0.99 |
| Q10: 0-7 | 252,973 | 48.3% | x 1.03 |


### city_groupes_crees

*Type: continuous | Impact: x 1.34*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 47.9% | x 1.02 |
| Q2: 0-0 | 252,973 | 42.3% | x 0.91 |
| Q3: 0-0 | 252,973 | 44.2% | x 0.95 |
| Q4: 0-0 | 252,973 | 47.6% | x 1.02 |
| Q5: 0-0 | 252,973 | 42.0% | x 0.90 |
| Q6: 0-0 | 252,973 | 44.4% | x 0.95 |
| Q7: 0-0 | 252,973 | 42.9% | x 0.92 |
| Q8: 0-0 | 252,973 | 49.0% | x 1.05 |
| Q9: 0-0 | 252,973 | 56.3% | x 1.21 |
| Q10: 0-15 | 252,973 | 50.5% | x 1.08 |


### city_logements_maj_situation

*Type: continuous | Impact: x 1.31*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 45.3% | x 0.97 |
| Q2: 0-0 | 252,973 | 45.0% | x 0.96 |
| Q3: 0-0 | 252,973 | 41.2% | x 0.88 |
| Q4: 0-0 | 252,973 | 48.8% | x 1.05 |
| Q5: 0-0 | 252,973 | 43.1% | x 0.92 |
| Q6: 0-0 | 252,973 | 45.8% | x 0.98 |
| Q7: 0-0 | 252,973 | 43.9% | x 0.94 |
| Q8: 0-3 | 252,973 | 50.8% | x 1.09 |
| Q9: 3-75 | 252,973 | 49.3% | x 1.06 |
| Q10: 75-8138 | 252,973 | 53.9% | x 1.15 |


### epci_type_detaille

*Type: categorical | Impact: x 1.28*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Communauté Urbaine | 91,484 | 54.1% | x 1.16 |
| Métropole | 511,484 | 51.9% | x 1.11 |
| Communauté d'Agglomération | 837,490 | 48.6% | x 1.04 |
| Communauté des Communes | 1,088,762 | 42.2% | x 0.90 |


### city_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.28*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 43.3% | x 0.93 |
| Q2: 0-0 | 252,973 | 44.9% | x 0.96 |
| Q3: 0-0 | 252,973 | 47.4% | x 1.01 |
| Q4: 0-0 | 252,973 | 46.2% | x 0.99 |
| Q5: 0-0 | 252,973 | 52.0% | x 1.11 |
| Q6: 0-0 | 252,973 | 40.5% | x 0.87 |
| Q7: 0-0 | 252,973 | 50.8% | x 1.09 |
| Q8: 0-0 | 252,973 | 51.0% | x 1.09 |
| Q9: 0-0 | 252,973 | 46.2% | x 0.99 |
| Q10: 0-3188 | 252,973 | 44.8% | x 0.96 |


### epci_logements_maj_situation

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 49.2% | x 1.05 |
| Q2: 0-0 | 252,973 | 42.3% | x 0.91 |
| Q3: 0-0 | 252,973 | 42.6% | x 0.91 |
| Q4: 0-0 | 252,973 | 43.9% | x 0.94 |
| Q5: 0-3 | 252,973 | 47.1% | x 1.01 |
| Q6: 3-40 | 252,973 | 47.6% | x 1.02 |
| Q7: 40-144 | 252,973 | 46.6% | x 1.00 |
| Q8: 144-459 | 252,973 | 49.2% | x 1.05 |
| Q9: 459-877 | 252,973 | 45.8% | x 0.98 |
| Q10: 877-10491 | 252,973 | 53.0% | x 1.13 |


### epci_logements_contactes_via_campagnes

*Type: continuous | Impact: x 1.25*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 42.1% | x 0.90 |
| Q2: 0-0 | 252,973 | 46.6% | x 1.00 |
| Q3: 0-0 | 252,973 | 43.8% | x 0.94 |
| Q4: 0-0 | 252,973 | 46.5% | x 1.00 |
| Q5: 0-0 | 252,973 | 45.5% | x 0.97 |
| Q6: 0-0 | 252,973 | 41.9% | x 0.90 |
| Q7: 0-0 | 252,973 | 52.5% | x 1.12 |
| Q8: 0-105 | 252,973 | 48.5% | x 1.04 |
| Q9: 105-1241 | 252,973 | 47.3% | x 1.01 |
| Q10: 1241-15314 | 252,973 | 52.5% | x 1.12 |


### city_utilisateurs_inscrits

*Type: continuous | Impact: x 1.23*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 43.7% | x 0.94 |
| Q2: 0-0 | 252,973 | 46.0% | x 0.99 |
| Q3: 0-0 | 252,973 | 45.1% | x 0.97 |
| Q4: 0-0 | 252,973 | 43.6% | x 0.93 |
| Q5: 0-0 | 252,973 | 49.1% | x 1.05 |
| Q6: 0-0 | 252,973 | 42.5% | x 0.91 |
| Q7: 0-0 | 252,973 | 51.8% | x 1.11 |
| Q8: 0-0 | 252,973 | 49.8% | x 1.07 |
| Q9: 0-1 | 252,973 | 43.1% | x 0.92 |
| Q10: 1-6 | 252,973 | 52.4% | x 1.12 |


### epci_utilisateurs_inscrits

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 44.7% | x 0.96 |
| Q2: 0-0 | 252,973 | 42.1% | x 0.90 |
| Q3: 0-1 | 252,973 | 43.2% | x 0.92 |
| Q4: 1-1 | 252,973 | 45.0% | x 0.96 |
| Q5: 1-2 | 252,973 | 48.7% | x 1.04 |
| Q6: 2-2 | 252,973 | 43.3% | x 0.93 |
| Q7: 2-3 | 252,973 | 50.0% | x 1.07 |
| Q8: 3-3 | 252,973 | 50.2% | x 1.08 |
| Q9: 3-6 | 252,973 | 48.6% | x 1.04 |
| Q10: 6-17 | 252,973 | 51.3% | x 1.10 |


### epci_groupes_crees

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 49.8% | x 1.07 |
| Q2: 0-0 | 252,973 | 41.0% | x 0.88 |
| Q3: 0-0 | 252,973 | 41.7% | x 0.89 |
| Q4: 0-0 | 252,973 | 46.0% | x 0.99 |
| Q5: 0-1 | 252,973 | 47.7% | x 1.02 |
| Q6: 1-1 | 252,973 | 48.0% | x 1.03 |
| Q7: 1-2 | 252,973 | 47.2% | x 1.01 |
| Q8: 2-5 | 252,973 | 48.9% | x 1.05 |
| Q9: 5-12 | 252,973 | 47.0% | x 1.01 |
| Q10: 12-94 | 252,973 | 49.7% | x 1.06 |


### epci_campagnes_envoyees

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 48.1% | x 1.03 |
| Q2: 0-0 | 252,973 | 43.9% | x 0.94 |
| Q3: 0-0 | 252,973 | 47.1% | x 1.01 |
| Q4: 0-0 | 252,973 | 44.8% | x 0.96 |
| Q5: 0-0 | 252,973 | 41.6% | x 0.89 |
| Q6: 0-0 | 252,973 | 47.2% | x 1.01 |
| Q7: 0-0 | 252,973 | 51.0% | x 1.09 |
| Q8: 0-1 | 252,973 | 42.0% | x 0.90 |
| Q9: 1-4 | 252,973 | 50.7% | x 1.08 |
| Q10: 4-56 | 252,973 | 50.8% | x 1.09 |


### epci_campagnes_creees

*Type: continuous | Impact: x 1.22*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 48.5% | x 1.04 |
| Q2: 0-0 | 252,973 | 43.9% | x 0.94 |
| Q3: 0-0 | 252,973 | 43.4% | x 0.93 |
| Q4: 0-0 | 252,973 | 41.2% | x 0.88 |
| Q5: 0-0 | 252,973 | 46.3% | x 0.99 |
| Q6: 0-0 | 252,973 | 47.6% | x 1.02 |
| Q7: 0-1 | 252,973 | 49.5% | x 1.06 |
| Q8: 1-2 | 252,973 | 48.0% | x 1.03 |
| Q9: 2-7 | 252,973 | 48.6% | x 1.04 |
| Q10: 7-56 | 252,973 | 50.2% | x 1.07 |


### city_campagnes_creees

*Type: continuous | Impact: x 1.21*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Q1: 0-0 | 252,973 | 42.8% | x 0.92 |
| Q2: 0-0 | 252,973 | 42.4% | x 0.91 |
| Q3: 0-0 | 252,973 | 46.3% | x 0.99 |
| Q4: 0-0 | 252,973 | 48.5% | x 1.04 |
| Q5: 0-0 | 252,973 | 48.4% | x 1.04 |
| Q6: 0-0 | 252,973 | 49.0% | x 1.05 |
| Q7: 0-0 | 252,973 | 42.5% | x 0.91 |
| Q8: 0-0 | 252,973 | 48.8% | x 1.04 |
| Q9: 0-0 | 252,973 | 51.4% | x 1.10 |
| Q10: 0-11 | 252,973 | 47.0% | x 1.01 |


### city_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.14*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a MAJ occupation | 470,727 | 51.8% | x 1.11 |
| Commune sans MAJ occupation | 2,059,003 | 45.5% | x 0.98 |


### city_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.13*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a MAJ situation | 602,307 | 51.3% | x 1.10 |
| Commune sans MAJ situation | 1,927,423 | 45.3% | x 0.97 |


### city_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.13*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a MAJ suivi | 569,385 | 51.3% | x 1.10 |
| Commune sans MAJ suivi | 1,960,345 | 45.4% | x 0.97 |


### city_connecte_90_jours

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune connectee 90j | 183,196 | 51.8% | x 1.11 |
| Commune non connectee 90j | 2,346,534 | 46.3% | x 0.99 |


### epci_ouvert

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI ouvert sur ZLV | 1,873,921 | 47.9% | x 1.03 |
| EPCI non ouvert | 655,299 | 43.3% | x 0.93 |


### city_ouvert

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune ouverte sur ZLV | 342,207 | 50.9% | x 1.09 |
| Commune non ouverte | 2,111,385 | 45.8% | x 0.98 |


### city_connecte_60_jours

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune connectee 60j | 163,691 | 51.1% | x 1.09 |
| Commune non connectee 60j | 2,366,039 | 46.4% | x 0.99 |


### city_a_1_groupe_cree

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a cree groupe | 184,950 | 50.9% | x 1.09 |
| Commune pas de groupe | 2,344,780 | 46.4% | x 0.99 |


### epci_connecte_90_jours

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI connecte 90j | 1,436,531 | 48.4% | x 1.04 |
| EPCI non connecte 90j | 1,093,199 | 44.5% | x 0.95 |


### epci_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a envoye campagne | 594,474 | 49.9% | x 1.07 |
| EPCI pas de campagne envoyee | 1,935,256 | 45.8% | x 0.98 |


### epci_a_1_campagne_envoyee_et_1_maj_situation

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI campagne+MAJ | 589,433 | 49.9% | x 1.07 |
| EPCI sans campagne+MAJ | 1,940,297 | 45.8% | x 0.98 |


### city_connecte_30_jours

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune connectee 30j | 127,591 | 50.7% | x 1.09 |
| Commune non connectee 30j | 2,402,139 | 46.5% | x 1.00 |


### city_a_1_campagne_creee

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a cree campagne | 102,688 | 50.6% | x 1.08 |
| Commune pas de campagne | 2,427,042 | 46.5% | x 1.00 |


### city_a_1_campagne_envoyee

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a envoye campagne | 60,138 | 50.8% | x 1.09 |
| Commune pas de campagne envoyee | 2,469,592 | 46.6% | x 1.00 |


### city_a_1_perimetre_importe

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune a importe perimetre | 83,781 | 50.5% | x 1.08 |
| Commune pas de perimetre | 2,445,949 | 46.6% | x 1.00 |


### epci_connecte_60_jours

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI connecte 60j | 1,352,746 | 48.4% | x 1.04 |
| EPCI non connecte 60j | 1,176,984 | 44.8% | x 0.96 |


### epci_connecte_30_jours

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI connecte 30j | 1,235,207 | 48.6% | x 1.04 |
| EPCI non connecte 30j | 1,294,523 | 44.9% | x 0.96 |


### epci_a_1_logement_maj_suivi

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a MAJ suivi | 1,354,303 | 48.4% | x 1.04 |
| EPCI sans MAJ suivi | 1,175,427 | 44.8% | x 0.96 |


### epci_a_1_logement_maj_situation

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a MAJ situation | 1,435,335 | 48.1% | x 1.03 |
| EPCI sans MAJ situation | 1,094,395 | 44.9% | x 0.96 |


### epci_a_1_logement_maj_occupation

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a MAJ occupation | 1,271,129 | 48.2% | x 1.03 |
| EPCI sans MAJ occupation | 1,258,601 | 45.2% | x 0.97 |


### epci_a_1_groupe_cree

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a cree groupe | 1,302,409 | 48.1% | x 1.03 |
| EPCI pas de groupe | 1,227,321 | 45.2% | x 0.97 |


### epci_a_1_campagne_creee

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a cree campagne | 918,923 | 48.6% | x 1.04 |
| EPCI pas de campagne | 1,610,807 | 45.6% | x 0.98 |


### epci_a_1_perimetre_importe

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| EPCI a importe perimetre | 674,232 | 48.8% | x 1.04 |
| EPCI pas de perimetre | 1,855,498 | 46.0% | x 0.98 |


### epci_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Intercommunalité | 2,529,220 | 46.7% | x 1.00 |


### city_type_simple

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune | 2,453,592 | 46.5% | x 1.00 |


### city_type_detaille

*Type: categorical | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Commune | 2,453,592 | 46.5% | x 1.00 |

