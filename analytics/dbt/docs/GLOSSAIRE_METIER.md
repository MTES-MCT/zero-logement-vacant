# Glossaire Métier - Zéro Logement Vacant

Ce glossaire définit les entités métier clés utilisées dans le projet ZLV et le pipeline dbt.

---

## Entités principales

### Logement (Housing)

**Définition** : Unité résidentielle individuelle (appartement ou maison) suivie dans le système ZLV.

**Identifiants** :
- `housing_id` : Identifiant unique UUID
- `invariant` : Identifiant invariant dans les Fichiers Fonciers
- `local_id` : Identifiant local DGFiP

**Caractéristiques clés** :
- `housing_kind` : Type de logement (`APPART`, `MAISON`)
- `living_area` : Surface habitable en m²
- `rooms_count` : Nombre de pièces
- `building_year` : Année de construction
- `geo_code` : Code INSEE de la commune (5 caractères)

**Tables principales** :
- `stg_production_housing`
- `marts_production_housing`

---

### Logement vacant (Vacant Housing)

**Définition** : Logement non occupé de manière permanente, identifié dans la base LOVAC ou par statut dans ZLV.

**Critères de vacance** :
- Code d'occupation `V` (Vacant)
- Présence dans la base LOVAC (Fichier des Logements Vacants)
- Taxé à la taxe sur les logements vacants (TLV)

**Indicateurs** :
- `occupancy` : Statut d'occupation (V=Vacant, L=Locataire, P=Propriétaire)
- `vacancy_start_year` : Année de début de vacance
- `is_housing_out` : Indicateur de sortie de vacance (0/1)

**Durée de vacance** :
- 0-2 ans : Vacance récente
- 3-5 ans : Vacance moyenne
- 6-10 ans : Vacance longue
- Plus de 10 ans : Vacance très longue

---

### Établissement (Establishment)

**Définition** : Collectivité territoriale ou service de l'État utilisant l'application ZLV pour lutter contre la vacance.

**Types d'établissements** :
| Code | Description |
|------|-------------|
| CA | Communauté d'Agglomération |
| CC | Communauté de Communes |
| CU | Communauté Urbaine |
| ME | Métropole |
| Commune | Commune seule |
| DDT/M | Direction Départementale des Territoires (et de la Mer) |

**Types regroupés** (`establishment_synthetic_type_label`) :
- `Intercommunalité` : CA, CC, CU, ME
- `Commune` : Commune seule
- `DDT/M` : Services de l'État
- `Autre` : Autres structures

**Indicateurs d'activité** :
- `is_active` : Établissement actif (au moins un utilisateur connecté)
- `user_number` : Nombre d'utilisateurs
- `total_campaigns` : Nombre de campagnes créées
- `total_sent_campaigns` : Nombre de campagnes envoyées

**Tables principales** :
- `stg_production_establishments`
- `marts_production_establishments`
- `marts_production_establishments_activation`

---

### Campagne (Campaign)

**Définition** : Action de contact organisée par un établissement pour joindre les propriétaires de logements vacants.

**Cycle de vie** :
1. `draft` : Brouillon en cours de préparation
2. `in-progress` : En cours de validation
3. `sending` : En cours d'envoi
4. `archived` : Archivée

**Dates clés** :
- `created_at` : Date de création
- `validated_at` : Date de validation
- `confirmed_at` : Date de confirmation
- `sent_at` : Date d'envoi

**Métriques** :
- `housing_number_in_campaign` : Nombre de logements ciblés
- `return_rate_3_months` : Taux de retour à 3 mois (%)
- `return_rate_36_months` : Taux de retour à 36 mois (%)

**Tables principales** :
- `stg_production_campaigns`
- `marts_production_campaigns`
- `int_production_campaigns_stats`

---

### Groupe (Group)

**Définition** : Collection de logements créée par un utilisateur pour organiser son travail et préparer des campagnes.

**Caractéristiques** :
- Créé par un utilisateur
- Appartient à un établissement
- Peut être archivé
- Peut être exporté

**Tables principales** :
- `stg_production_groups`
- `marts_production_groups`
- `stg_production_groups_housing` (relation N-N)

---

### Propriétaire (Owner)

**Définition** : Personne physique ou morale détenant des droits de propriété sur un ou plusieurs logements.

**Types de propriétaires** (`owner_kind_class`) :
- `Particulier` : Personne physique
- `SCI` : Société Civile Immobilière
- `Autre personne morale` : Entreprise, association, collectivité
- `Indivision` : Propriété partagée entre plusieurs personnes

**Caractéristiques** :
- `full_name` : Nom complet
- `birth_date` : Date de naissance (personnes physiques)
- `email` / `phone` : Coordonnées de contact
- `address_dgfip` : Adresse selon la DGFiP

**Indicateurs** :
- `owner_is_local` : Propriétaire dans la même commune ou département
- `owner_is_distant` : Propriétaire dans une autre région
- `owner_is_multi_owner` : Possède plusieurs logements

**Tables principales** :
- `stg_production_owners`
- `marts_production_owners`
- `stg_production_owners_housing` (relation N-N)

---

### Événement (Event)

**Définition** : Enregistrement d'une action ou mise à jour sur un logement, propriétaire ou campagne.

**Types d'événements principaux** :
| Type | Description |
|------|-------------|
| `housing:status-updated` | Mise à jour du statut de suivi |
| `housing:occupancy-updated` | Mise à jour du statut d'occupation |
| `housing:campaign-attached` | Logement ajouté à une campagne |
| `housing:group-attached` | Logement ajouté à un groupe |

**Source de l'événement** (`user_source`) :
- `zlv` : Événement automatique de l'application
- `user` : Événement créé par un utilisateur

**Version** :
- `old` : Ancien format (avant migration, stocké en texte)
- `new` : Nouveau format JSON structuré

**Tables principales** :
- `stg_production_events`
- `int_production_events`
- `int_production_housing_last_status`

---

### Utilisateur (User)

**Définition** : Personne utilisant l'application ZLV, rattachée à un établissement.

**Caractéristiques** :
- `email` : Identifiant de connexion
- `role` : Rôle dans l'application
- `establishment_id` : Établissement de rattachement
- `activated_at` : Date d'activation du compte
- `last_authenticated_at` : Dernière connexion

**Tables principales** :
- `stg_production_users`
- `marts_production_users`

---

## Statuts de suivi

Les statuts de suivi décrivent l'avancement du contact avec le propriétaire.

| Code | Label | Description |
|------|-------|-------------|
| 0 | Non-suivi | Logement non pris en charge |
| 1 | En attente de retour | Courrier envoyé, attente de réponse |
| 2 | Premier contact | Premier échange avec le propriétaire |
| 3 | Suivi en cours | Accompagnement actif du propriétaire |
| 4 | Suivi terminé | Dossier clôturé (sortie de vacance ou abandon) |
| 5 | Bloqué | Dossier bloqué (succession, contentieux, etc.) |

---

## Codes d'occupation

| Code | Signification |
|------|---------------|
| V | Vacant |
| L | Loué / En location |
| P | Occupé par le propriétaire |
| RS | Résidence secondaire |
| A | Autre |
| T | Temporaire |
| B | Bail en cours |
| D | Démoli |
| N | Non applicable |

---

## Territoires spéciaux

| Territoire | Description |
|------------|-------------|
| OPAH | Opération Programmée d'Amélioration de l'Habitat |
| TLV | Zone soumise à la Taxe sur les Logements Vacants |
| Action Cœur de Ville | Programme de revitalisation des centres-villes |
| Petite Ville de Demain | Programme pour les communes < 20k habitants |
| Village d'Avenir | Programme pour les communes rurales |
| ORT | Opération de Revitalisation de Territoire |

---

## Sources de données

### LOVAC (Fichier des Logements Vacants)

Base de données annuelle des logements vacants en France, produite par la DGFiP à partir des fichiers fiscaux.

- Millésimes disponibles : 2019 à 2025
- Critères : Logement non occupé depuis au moins 1 an
- Variables : Caractéristiques du logement, localisation, propriétaire

### Fichiers Fonciers (FF)

Base de données cadastrale produite par le CEREMA à partir des fichiers de la DGFiP.

- Millésime actuel : 2024
- Contenu : Logements, bâtiments, propriétaires, parcelles
- Couverture : France entière

### INSEE

Institut National de la Statistique et des Études Économiques.

- COG : Code Officiel Géographique (communes, EPCI)
- Densité : Grille communale de densité
- Recensement : Population municipale

### DGALN / DGFIP

- Zonage ABC : Classification des zones de tension immobilière
- Carte des loyers : Loyers médians par commune
- Fiscalité locale : Taux de taxe foncière, TH, TEOM

---

## Métriques clés

### Volume de données (janvier 2025)

| Entité | Volume |
|--------|--------|
| Logements | 10.7 millions |
| Propriétaires | 36 millions |
| Établissements | 36,672 (1,322 actifs) |
| Campagnes | 1,576 (938 envoyées) |
| Utilisateurs | 2,316 |
| Événements | 13 millions |

### Indicateurs de suivi

- **Logements avec suivi utilisateur** : 109,457
- **Logements suivi terminé** : 22,934
- **Taux de retour moyen** : 48.6% à 3 mois
