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
| 1 | group_intensity | x 2.18 | 48.2% (Aucun groupe) | 22.1% (4+ groupes) |
| 2 | was_exported_from_group | x 1.66 | 48.2% (Non exporte) | 29.1% (Exporte depuis groupe) |
| 3 | is_in_group | x 1.62 | 48.2% (Pas dans un groupe) | 29.8% (Dans un groupe) |
| 4 | zlv_engagement_category | x 1.46 | 54.2% (Engagement moyen) | 37.2% (Engagement faible) |
| 5 | establishment_kind | x 1.36 | 57.0% (CU) | 42.0% (CC) |

---

## Detail par feature

### group_intensity

*Type: categorical | Impact: x 2.18*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Aucun groupe | 2,321,081 | 48.2% | x 1.03 |
| 2-3 groupes | 72,084 | 32.2% | x 0.69 |
| 1 groupe | 115,756 | 29.6% | x 0.63 |
| 4+ groupes | 20,809 | 22.1% | x 0.47 |


### was_exported_from_group

*Type: boolean | Impact: x 1.66*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non exporte | 2,335,125 | 48.2% | x 1.03 |
| Exporte depuis groupe | 194,605 | 29.1% | x 0.62 |


### is_in_group

*Type: boolean | Impact: x 1.62*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Pas dans un groupe | 2,321,081 | 48.2% | x 1.03 |
| Dans un groupe | 208,649 | 29.8% | x 0.64 |


### zlv_engagement_category

*Type: categorical | Impact: x 1.46*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Engagement moyen | 37,403 | 54.2% | x 1.16 |
| Aucun engagement | 2,230,063 | 47.6% | x 1.02 |
| Engagement fort | 42,595 | 43.1% | x 0.92 |
| Engagement faible | 219,669 | 37.2% | x 0.80 |


### establishment_kind

*Type: categorical | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| CU | 5,451 | 57.0% | x 1.22 |
| ME | 60,022 | 54.4% | x 1.16 |
| CA | 87,549 | 48.9% | x 1.05 |
| SIVOM | 6,676 | 48.2% | x 1.03 |
| Commune | 298,814 | 46.8% | x 1.00 |
| CTU | 10,912 | 44.2% | x 0.95 |
| CC | 122,894 | 42.0% | x 0.90 |


### establishment_kind_label

*Type: categorical | Impact: x 1.36*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Communauté Urbaine | 5,451 | 57.0% | x 1.22 |
| Métropole | 60,022 | 54.4% | x 1.16 |
| Communauté d'Agglomération | 87,549 | 48.9% | x 1.05 |
| Commune | 298,814 | 46.8% | x 1.00 |
| Autre | 17,588 | 45.7% | x 0.98 |
| Communauté des Communes | 122,894 | 42.0% | x 0.90 |


### connecte_90_derniers_jours

*Type: boolean | Impact: x 1.11*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 90j | 158,034 | 50.6% | x 1.08 |
| Non connecte 90j | 434,284 | 45.6% | x 0.98 |


### a_depose_1_perimetre

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A depose perimetre | 108,958 | 50.6% | x 1.08 |
| Pas de perimetre | 483,360 | 46.1% | x 0.99 |


### a_envoye_1_campagne

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A envoye campagne | 75,575 | 51.0% | x 1.09 |
| Pas de campagne envoyee | 516,743 | 46.4% | x 0.99 |


### contact_intensity

*Type: categorical | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non contacte | 2,509,776 | 46.7% | x 1.00 |
| 2-3 contacts | 2,648 | 44.2% | x 0.95 |
| 1 contact | 17,255 | 42.8% | x 0.92 |


### was_contacted_by_zlv

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non contacte | 2,509,776 | 46.7% | x 1.00 |
| Contacte par ZLV | 19,954 | 43.0% | x 0.92 |


### has_received_campaign

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Pas de campagne | 2,509,776 | 46.7% | x 1.00 |
| A recu une campagne | 19,954 | 43.0% | x 0.92 |


### a_cree_1_groupe

*Type: boolean | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A cree groupe | 162,679 | 49.8% | x 1.07 |
| Pas de groupe | 429,639 | 45.9% | x 0.98 |


### connecte_30_derniers_jours

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 30j | 107,786 | 49.3% | x 1.06 |
| Non connecte 30j | 484,532 | 46.4% | x 0.99 |


### a_cree_1_campagne

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A cree campagne | 111,575 | 49.4% | x 1.06 |
| Pas de campagne creee | 480,743 | 46.4% | x 0.99 |


### establishment_has_active_users

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Avec utilisateurs actifs | 221,916 | 49.4% | x 1.06 |
| Sans utilisateurs | 2,307,814 | 46.5% | x 0.99 |


### connecte_60_derniers_jours

*Type: boolean | Impact: x 1.05*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 60j | 125,652 | 48.9% | x 1.05 |
| Non connecte 60j | 466,666 | 46.4% | x 0.99 |


### establishment_type_regroupe

*Type: categorical | Impact: x 1.03*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Intercommunalité | 275,916 | 47.1% | x 1.01 |
| Commune | 298,814 | 46.8% | x 1.00 |
| Autre | 17,588 | 45.7% | x 0.98 |


### is_on_user_territory

*Type: boolean | Impact: x 1.01*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Territoire avec utilisateurs | 590,544 | 46.9% | x 1.00 |
| Territoire sans utilisateurs | 1,939,186 | 46.6% | x 1.00 |

