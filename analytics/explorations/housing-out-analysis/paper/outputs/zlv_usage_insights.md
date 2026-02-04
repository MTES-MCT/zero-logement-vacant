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
| 1 | group_intensity | x 2.24 | 48.1% (Aucun groupe) | 21.5% (4+ groupes) |
| 2 | was_exported_from_group | x 1.62 | 48.1% (Non exporte) | 29.7% (Exporte depuis groupe) |
| 3 | is_in_group | x 1.59 | 48.1% (Pas dans un groupe) | 30.3% (Dans un groupe) |
| 4 | zlv_engagement_category | x 1.43 | 54.2% (Engagement moyen) | 37.9% (Engagement faible) |
| 5 | establishment_kind | x 1.36 | 57.0% (CU) | 42.0% (CC) |

---

## Detail par feature

### group_intensity

*Type: categorical | Impact: x 2.24*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Aucun groupe | 2,329,638 | 48.1% | x 1.03 |
| 2-3 groupes | 67,183 | 34.0% | x 0.73 |
| 1 groupe | 113,613 | 29.7% | x 0.64 |
| 4+ groupes | 19,296 | 21.5% | x 0.46 |


### was_exported_from_group

*Type: boolean | Impact: x 1.62*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non exporte | 2,342,581 | 48.1% | x 1.03 |
| Exporte depuis groupe | 187,149 | 29.7% | x 0.64 |


### is_in_group

*Type: boolean | Impact: x 1.59*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Pas dans un groupe | 2,329,638 | 48.1% | x 1.03 |
| Dans un groupe | 200,092 | 30.3% | x 0.65 |


### zlv_engagement_category

*Type: categorical | Impact: x 1.43*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Engagement moyen | 36,573 | 54.2% | x 1.16 |
| Aucun engagement | 2,238,244 | 47.5% | x 1.02 |
| Engagement fort | 42,847 | 43.4% | x 0.93 |
| Engagement faible | 212,066 | 37.9% | x 0.81 |


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


### connecte_60_derniers_jours

*Type: boolean | Impact: x 1.13*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 60j | 137,400 | 51.5% | x 1.10 |
| Non connecte 60j | 454,918 | 45.6% | x 0.98 |


### connecte_90_derniers_jours

*Type: boolean | Impact: x 1.12*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 90j | 156,016 | 51.0% | x 1.09 |
| Non connecte 90j | 436,302 | 45.5% | x 0.97 |


### a_depose_1_perimetre

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A depose perimetre | 108,341 | 50.6% | x 1.08 |
| Pas de perimetre | 483,977 | 46.1% | x 0.99 |


### a_envoye_1_campagne

*Type: boolean | Impact: x 1.10*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A envoye campagne | 75,067 | 51.0% | x 1.09 |
| Pas de campagne envoyee | 517,251 | 46.4% | x 0.99 |


### a_cree_1_groupe

*Type: boolean | Impact: x 1.09*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A cree groupe | 160,125 | 49.9% | x 1.07 |
| Pas de groupe | 432,193 | 45.9% | x 0.98 |


### contact_intensity

*Type: categorical | Impact: x 1.08*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non contacte | 2,510,240 | 46.7% | x 1.00 |
| 2-3 contacts | 2,546 | 44.9% | x 0.96 |
| 1 contact | 16,893 | 43.4% | x 0.93 |


### was_contacted_by_zlv

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Non contacte | 2,510,240 | 46.7% | x 1.00 |
| Contacte par ZLV | 19,490 | 43.6% | x 0.93 |


### has_received_campaign

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Pas de campagne | 2,510,240 | 46.7% | x 1.00 |
| A recu une campagne | 19,490 | 43.6% | x 0.93 |


### a_cree_1_campagne

*Type: boolean | Impact: x 1.07*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| A cree campagne | 110,801 | 49.4% | x 1.06 |
| Pas de campagne creee | 481,517 | 46.4% | x 0.99 |


### establishment_has_active_users

*Type: boolean | Impact: x 1.06*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Avec utilisateurs actifs | 221,056 | 49.4% | x 1.06 |
| Sans utilisateurs | 2,308,674 | 46.5% | x 0.99 |


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


### connecte_30_derniers_jours

*Type: boolean | Impact: x 1.00*

| Modalite | N | Taux sortie | Multiplicateur |
|----------|---|-------------|----------------|
| Connecte 30j | 63,342 | 47.0% | x 1.01 |
| Non connecte 30j | 528,976 | 46.9% | x 1.00 |

