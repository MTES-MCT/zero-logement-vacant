# Les logements vacants en France - Facteurs de sortie de vacance

*Analyse generee automatiquement*

---

## Statistique cle

**46.7%** des logements vacants sortent de la vacance,
soit **1,181,700** logements sur **2,529,730** analyses.

---

## Top 10 facteurs les plus impactants

| Rang | Categorie | Feature | Impact | Taux haut vs bas |
|------|-----------|---------|--------|------------------|
| 1 | proprietaires | owner_age_category | x 5.03 | 69.7% vs 13.8% |
| 2 | proprietaires | owner_generation | x 4.94 | 68.4% vs 13.8% |
| 3 | caracteristiques | is_taxed | x 3.98 | 79.5% vs 20.0% |
| 4 | caracteristiques | vacancy_severity | x 3.93 | 66.9% vs 17.0% |
| 5 | caracteristiques | vacancy_duration_category | x 3.88 | 66.1% vs 17.0% |
| 6 | proprietaires | owner_is_company | x 3.68 | 53.3% vs 14.5% |
| 7 | caracteristiques | cadastral_classification_label | x 3.20 | 93.1% vs 29.1% |
| 8 | caracteristiques | has_recent_mutation | x 3.10 | 52.0% vs 16.8% |
| 9 | caracteristiques | rental_value_category | x 2.54 | 100.0% vs 39.4% |
| 10 | caracteristiques | condominium | x 2.54 | 100.0% vs 39.4% |

---

## Caracteristiques

- **is_taxed** -> **x 3.98** (Non taxe vs Taxe vacance)
  - Taux de sortie: 79.5% vs 20.0%

- **vacancy_severity** -> **x 3.93** (Moderee vs Legere)
  - Taux de sortie: 66.9% vs 17.0%

- **vacancy_duration_category** -> **x 3.88** (3-5 ans vs 0-2 ans)
  - Taux de sortie: 66.1% vs 17.0%

- **cadastral_classification_label** -> **x 3.20** (Inconnu vs Tres mediocre)
  - Taux de sortie: 93.1% vs 29.1%

- **has_recent_mutation** -> **x 3.10** (Pas de mutation recente vs Mutation recente)
  - Taux de sortie: 52.0% vs 16.8%

---

## Geographie

- **date_thlv** -> **x 1.88** (2022-09-15 vs 2024-11-04)
  - Taux de sortie: 65.1% vs 34.6%

- **departement_code** -> **x 1.66** (76 vs 23)
  - Taux de sortie: 55.9% vs 33.7%

- **dvf_total_transactions_2019_2024** -> **x 1.56** (Q10 vs Q1)
  - Taux de sortie: 56.8% vs 36.5%

- **population_2022** -> **x 1.55** (Q10 vs Q1)
  - Taux de sortie: 56.6% vs 36.6%

- **densite_grid_7** -> **x 1.52** (Q2 vs Q10)
  - Taux de sortie: 55.4% vs 36.5%

---

## Proprietaires

- **owner_age_category** -> **x 5.03** (Moins de 40 ans vs Age inconnu)
  - Taux de sortie: 69.7% vs 13.8%

- **owner_generation** -> **x 4.94** (Millennial vs Inconnu)
  - Taux de sortie: 68.4% vs 13.8%

- **owner_is_company** -> **x 3.68** (Non societe vs Societe)
  - Taux de sortie: 53.3% vs 14.5%

- **owner_has_phone** -> **x 1.70** (A un telephone vs Sans telephone)
  - Taux de sortie: 79.2% vs 46.6%

- **owner_contactable** -> **x 1.68** (Contactable vs Non contactable)
  - Taux de sortie: 78.3% vs 46.6%

---

## Zlv_Usage

- **city_campagnes_envoyees** -> **x 1.36** (Q8 vs Q1)
  - Taux de sortie: 55.9% vs 41.2%

- **city_groupes_crees** -> **x 1.34** (Q9 vs Q5)
  - Taux de sortie: 56.3% vs 42.0%

- **city_logements_maj_situation** -> **x 1.31** (Q10 vs Q3)
  - Taux de sortie: 53.9% vs 41.2%

- **epci_type_detaille** -> **x 1.28** (Communauté Urbaine vs Communauté des Communes)
  - Taux de sortie: 54.1% vs 42.2%

- **city_logements_contactes_via_campagnes** -> **x 1.28** (Q5 vs Q6)
  - Taux de sortie: 52.0% vs 40.5%

---

## Notes methodologiques

### Sources et definitions
- **Source**: Tables marts_bi_housing_* (MotherDuck)
- **Definition sortie de vacance**: Logement present dans LOVAC 2024, absent de LOVAC 2025
- **Taux global de reference**: 46.71%

### Metriques
- **Multiplicateur**: Ratio taux de sortie modalite / taux global
- **Impact**: Ratio taux max / taux min entre modalites (mesure de discrimination)

### Methodologie features continues
- Division en **deciles** (NTILE 10) pour creer des groupes de taille egale
- Chaque bucket contient ~10% des observations
- Compare les quantiles extremes (Q10 vs Q1)

### Variables exclues (tautologiques)
- `last_event_status_label_*`: Encodent le resultat (ex: 'Suivi termine' = sortie enregistree)
- `update_intensity`, `has_*_update`: MAJ faites POUR enregistrer la sortie
- Ces variables ont des impacts >100x car elles **encodent** la cible
