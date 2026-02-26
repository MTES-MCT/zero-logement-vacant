# Dossier d'Installation (DI)
# Zéro Logement Vacant

**Version:** 1.1
**Date:** 26 février 2026
**Auteur:** Loïc Guillois
**Statut:** En vigueur

---

## Introduction

### Qu'est-ce qu'un dossier d'installation ?

Un dossier d'installation est un guide qui explique **comment installer et configurer** l'application, que ce soit pour développer dessus ou pour la déployer en production.

**Analogie :** C'est comme le manuel de montage d'un meuble IKEA : une liste des pièces nécessaires, puis les étapes à suivre dans l'ordre.

### À qui s'adresse ce document ?

- **Nouveaux développeurs** : pour installer l'environnement de travail
- **DevOps / SRE** : pour déployer l'application en production
- **Contributeurs** : pour comprendre comment le projet est organisé

### Ce que vous allez apprendre

1. Comment installer les outils nécessaires
2. Comment configurer l'environnement de développement
3. Comment déployer sur Clever Cloud (production)
4. Comment résoudre les problèmes courants d'installation

---

## 1. Comprendre les prérequis

### 1.1 Qu'est-ce qu'un prérequis ?

Un prérequis est un logiciel ou une configuration qui doit être en place **avant** de pouvoir installer l'application. Sans ces éléments, l'installation échouera.

### 1.2 Liste des logiciels nécessaires

| Logiciel | Version | Rôle | Comment vérifier |
|----------|---------|------|------------------|
| **Node.js** | v24+ | Exécute le code JavaScript | `node --version` |
| **Yarn** | v4+ | Gère les dépendances | `yarn --version` |
| **Docker** | 20+ | Lance les services (DB, Redis) | `docker --version` |
| **Docker Compose** | 2.0+ | Orchestre plusieurs conteneurs | `docker compose version` |
| **Git** | 2.30+ | Gestion de versions | `git --version` |
| **PostgreSQL Client** | 14+ | Connexion à la base de données | `psql --version` |

**Qu'est-ce que chaque outil fait ?**

- **Node.js** : C'est le "moteur" qui exécute le code JavaScript de l'application, côté serveur (pas dans le navigateur)
- **Yarn** : Comme un gestionnaire de courses, il télécharge et organise toutes les bibliothèques dont le code a besoin
- **Docker** : Crée des "conteneurs" isolés pour faire tourner des services comme la base de données, sans les installer directement sur votre machine
- **Git** : Permet de télécharger le code source et de suivre les modifications

### 1.3 Installer Node.js

Node.js est le plus important. Nous utilisons **nvm** (Node Version Manager) pour l'installer, ce qui permet de gérer facilement plusieurs versions.

```bash
# Étape 1 : Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Étape 2 : Fermer et rouvrir votre terminal (important !)

# Étape 3 : Installer Node.js version 24
nvm install 24
nvm use 24

# Étape 4 : Vérifier que ça fonctionne
node --version  # Doit afficher v24.x.x
```

**Pourquoi la version 24 ?** Le projet utilise des fonctionnalités récentes de JavaScript qui ne sont disponibles que dans cette version.

### 1.4 Installer Yarn

Yarn est inclus avec Node.js moderne via "corepack", il suffit de l'activer :

```bash
# Activer corepack (gestionnaire de packages intégré)
corepack enable

# Yarn v4 sera automatiquement utilisé grâce au fichier .yarnrc.yml du projet
```

**Qu'est-ce que corepack ?** C'est un outil intégré à Node.js qui gère automatiquement les gestionnaires de packages (Yarn, npm). Plus besoin d'installer Yarn séparément.

### 1.5 Installer Docker

Docker permet de faire tourner PostgreSQL, Redis et autres services sans les installer sur votre machine.

**Sur macOS :**
```bash
# Via Homebrew (si Homebrew est installé)
brew install --cask docker

# Puis ouvrir Docker Desktop depuis les Applications
```

**Sur Linux (Ubuntu/Debian) :**
```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Permettre d'utiliser Docker sans sudo
sudo usermod -aG docker $USER

# Fermer et rouvrir votre session (ou redémarrer)
```

**Vérifier que Docker fonctionne :**
```bash
docker run hello-world
# Doit afficher "Hello from Docker!"
```

---

## 2. Installation de l'environnement de développement

### 2.1 Vue d'ensemble

L'installation se déroule en 4 étapes principales :

```mermaid
flowchart LR
    A["1. Télécharger<br/>le code"] --> B["2. Installer<br/>les dépendances"]
    B --> C["3. Lancer<br/>les services"]
    C --> D["4. Configurer<br/>les variables"]
```

### 2.2 Étape 1 : Télécharger le code source

```bash
# Cloner le repository (télécharger le code)
git clone git@github.com:MTES-MCT/zero-logement-vacant.git

# Entrer dans le dossier du projet
cd zero-logement-vacant
```

**Qu'est-ce que "cloner" ?** C'est créer une copie locale du code source qui est stocké sur GitHub. Vous aurez ainsi tout le code sur votre machine.

### 2.3 Étape 2 : Installer les dépendances

Les "dépendances" sont les bibliothèques externes dont le code a besoin pour fonctionner (React, Express, etc.).

```bash
# Installer toutes les dépendances
yarn install
```

Cette commande peut prendre quelques minutes. Elle télécharge et organise toutes les bibliothèques.

**Structure du projet après installation :**

```
zero-logement-vacant/
├── frontend/          # Application React (interface utilisateur)
├── server/            # API Express (logique métier)
├── queue/             # Traitement des tâches en arrière-plan
├── e2e/               # Tests de bout en bout
└── packages/          # Code partagé entre frontend et server
    ├── models/        # Définitions des données
    ├── schemas/       # Règles de validation
    └── utils/         # Fonctions utilitaires
```

### 2.4 Étape 3 : Lancer les services avec Docker

L'application a besoin de plusieurs services pour fonctionner : une base de données (PostgreSQL), un cache (Redis), etc. Docker les fait tous tourner ensemble.

```bash
# Démarrer les services en arrière-plan
docker compose -f .docker/docker-compose.yml up -d

# Vérifier qu'ils sont bien lancés
docker compose -f .docker/docker-compose.yml ps
```

**Services démarrés :**

| Service | Port | Rôle |
|---------|------|------|
| PostgreSQL | 5432 | Stocke toutes les données (logements, utilisateurs, etc.) |
| Redis | 6379 | File d'attente pour les tâches en arrière-plan |
| Elasticsearch | 9200 | Recherche dans les logs (optionnel en développement) |

**Que signifie "-d" ?** C'est l'option "detached" (détaché). Les services tournent en arrière-plan, vous récupérez votre terminal.

### 2.5 Étape 4 : Configurer les variables d'environnement

Les "variables d'environnement" sont des paramètres de configuration (mots de passe, URLs, clés API) qui ne doivent pas être dans le code source.

**Pourquoi ?** Pour des raisons de sécurité (ne pas partager les mots de passe) et de flexibilité (pouvoir changer la configuration sans modifier le code).

#### Configuration du Frontend

```bash
# Copier le fichier exemple
cp frontend/.env.example frontend/.env
```

Contenu minimal du fichier `frontend/.env` :

```env
# Adresse de l'API backend
VITE_API_URL=http://localhost:3001/api

# Activer l'authentification à deux facteurs (2FA)
VITE_FEATURE_FLAG_2FA=true
```

#### Configuration du Backend

```bash
# Copier le fichier exemple
cp server/.env.example server/.env
```

Contenu minimal du fichier `server/.env` :

```env
# Mode développement
NODE_ENV=development

# Port sur lequel l'API écoute
PORT=3001

# URL publique de l'application
APP_URL=http://localhost:3000

# Connexion à la base de données
# Format: postgres://utilisateur:motdepasse@hôte:port/nom_base
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zlv

# Connexion à Redis (cache et files d'attente)
REDIS_URL=redis://localhost:6379

# Secret pour les tokens d'authentification (au moins 32 caractères)
# En développement, utilisez une valeur quelconque
AUTH_SECRET=votre-secret-local-au-moins-32-caracteres
AUTH_EXPIRES_IN=7d
```

#### Configuration du Queue Worker

```bash
cp queue/.env.example queue/.env
```

Contenu du fichier `queue/.env` :

```env
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zlv
REDIS_URL=redis://localhost:6379
```

### 2.6 Script d'installation automatique

Pour simplifier, un script fait tout automatiquement :

```bash
# Définir les URLs des bases de données
export DEV_DB=postgres://postgres:postgres@localhost/zlv
export TEST_DB=postgres://postgres:postgres@localhost/zlvtest

# Lancer le script d'installation
bash .docker/setup.sh
```

Ce script :
1. Démarre les conteneurs Docker
2. Crée les bases de données
3. Exécute les migrations
4. Charge les données de test

---

## 3. Initialiser la base de données

### 3.1 Qu'est-ce qu'une migration ?

Une "migration" est un script qui modifie la structure de la base de données (création de tables, ajout de colonnes, etc.). Les migrations sont versionnées et exécutées dans l'ordre.

**Analogie :** C'est comme des mises à jour du plan d'un bâtiment. Chaque migration ajoute ou modifie une pièce.

### 3.2 Créer et migrer la base

```bash
# Créer la base de données (si elle n'existe pas)
createdb zlv

# Appliquer toutes les migrations
yarn workspace @zerologementvacant/server migrate

# Charger les données de test (seed)
yarn workspace @zerologementvacant/server seed
```

**Qu'est-ce que le "seed" ?** Ce sont des données initiales pour pouvoir tester l'application (utilisateurs de test, logements fictifs, etc.).

### 3.3 Utilisateurs de test

Le seed crée des données pour deux collectivités de test et plusieurs utilisateurs :

**Collectivités de test :**
- Eurométropole de Strasbourg
- CA Saint-Lô Agglo

**Comptes utilisateurs :**

| Email | Rôle | Périmètre |
|-------|------|-----------|
| `test.strasbourg@zlv.fr` | Utilisateur | Eurométropole de Strasbourg |
| `test.saintlo@zlv.fr` | Utilisateur | CA Saint-Lô Agglo |
| `test.admin@zlv.fr` | Administrateur | National |
| `test.visitor@zlv.fr` | Lecture seule | France entière |

**Mots de passe :** Les mots de passe sont partagés sur Vaultwarden : https://vaultwarden.incubateur.net/

### 3.5 Commandes de migration utiles

```bash
# Voir l'état des migrations (lesquelles ont été appliquées)
yarn workspace @zerologementvacant/server migrate:status

# Annuler la dernière migration (en cas d'erreur)
yarn workspace @zerologementvacant/server migrate:rollback

# Créer une nouvelle migration
yarn workspace @zerologementvacant/server migrate:make nom_de_la_migration
```

### 3.6 Extensions PostgreSQL

PostgreSQL utilise des "extensions" pour des fonctionnalités avancées. Elles sont généralement créées automatiquement par les migrations :

```sql
-- Génération d'identifiants uniques (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recherche sans accents
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Recherche floue (tolérance aux fautes de frappe)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Données géographiques (optionnel)
CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## 4. Lancer l'application en développement

### 4.1 Démarrer les services

Vous aurez besoin de **3 terminaux** pour lancer tous les services :

**Terminal 1 - Backend (API) :**
```bash
yarn workspace @zerologementvacant/server dev
# → L'API est accessible sur http://localhost:3001/api
```

**Terminal 2 - Frontend (Interface) :**
```bash
yarn workspace @zerologementvacant/front dev
# → L'application est accessible sur http://localhost:3000
```

**Terminal 3 - Queue Worker (optionnel) :**
```bash
yarn workspace @zerologementvacant/queue dev
# → Traite les tâches en arrière-plan (exports, etc.)
```

### 4.2 Vérifier que tout fonctionne

1. **Frontend** : Ouvrir http://localhost:3000 dans votre navigateur
2. **Backend** : Tester l'API avec :
   ```bash
   curl http://localhost:3001/api
   # Doit répondre : { "status": "healthy" }
   ```

### 4.3 Documentation API (Swagger)

L'API dispose d'une documentation interactive Swagger accessible en développement :

**Accès :**
- **Interface Swagger UI** : http://localhost:3001/api-docs
- **Spécification OpenAPI (JSON)** : http://localhost:3001/api-docs.json

**Fonctionnalités :**
- Liste de tous les endpoints avec leurs paramètres
- Schémas des requêtes et réponses
- Possibilité de tester les endpoints directement
- Authentification JWT supportée

**En production :** Désactivé par défaut. Activation possible via `ENABLE_SWAGGER=true`.

### 4.4 Exécuter les tests

Les tests vérifient que le code fonctionne correctement :

```bash
# Lancer tous les tests
yarn test

# Tester uniquement le serveur
yarn nx test server

# Tester uniquement le frontend
yarn nx test frontend
```

---

## 5. Déploiement sur Clever Cloud (Production)

### 5.1 Qu'est-ce que Clever Cloud ?

Clever Cloud est une plateforme française de type "PaaS" (Platform as a Service). Au lieu de gérer des serveurs, vous déployez votre code et Clever Cloud s'occupe du reste : sécurité, mises à jour, sauvegardes, certificats SSL.

**Avantages :**
- Hébergement en France (conformité RGPD)
- Déploiement automatique depuis Git
- Sauvegardes automatiques
- Mise à l'échelle automatique

### 5.2 Architecture sur Clever Cloud

```mermaid
flowchart TB
    subgraph CleverCloud["Clever Cloud"]
        subgraph Apps["Applications"]
            Frontend["<b>Frontend</b><br/>Application React<br/>Interface utilisateur"]
            Backend["<b>Backend</b><br/>API Express<br/>Logique métier"]
            Queue["<b>Queue</b><br/>Worker BullMQ<br/>Tâches de fond"]
        end

        subgraph AddOns["Add-ons (Services gérés)"]
            PostgreSQL[("PostgreSQL<br/>Base de données")]
            Redis[("Redis<br/>Cache/Queues")]
            ES[("Elasticsearch<br/>Logs")]
            Cellar[("Cellar S3<br/>Fichiers")]
        end
    end

    Frontend --> Backend
    Backend --> PostgreSQL
    Backend --> Redis
    Backend --> ES
    Backend --> Cellar
    Queue --> Redis
    Queue --> PostgreSQL
```

### 5.3 Prérequis pour la production

1. **Compte Clever Cloud** avec accès à l'organisation
2. **CLI Clever Cloud** installé
3. **Accès GitHub** au repository

#### Installer la CLI Clever Cloud

```bash
# Via npm
npm install -g clever-tools

# S'authentifier
clever login
```

### 5.4 Créer les applications

#### Option 1 : Via le Dashboard (recommandé pour débuter)

1. Aller sur https://console.clever-cloud.com/
2. Cliquer "Create an application"
3. Choisir "Node.js"
4. Configurer le déploiement Git

#### Option 2 : Via la CLI

```bash
# Se lier à une application existante
clever link <app-id>

# Ou créer une nouvelle application
clever create --type node <nom-application> --org <org-id>
```

### 5.5 Créer les add-ons (services)

Les "add-ons" sont des services gérés par Clever Cloud :

```bash
# Base de données PostgreSQL
clever addon create postgresql-addon <nom> --link <app-id>

# Cache Redis
clever addon create redis-addon <nom> --link <app-id>

# Stockage de fichiers (S3)
clever addon create cellar-addon <nom> --link <app-id>
```

Quand un add-on est lié à une application, les variables de connexion sont automatiquement injectées.

### 5.6 Configurer les variables d'environnement

```bash
# Configuration de base
clever env set NODE_ENV=production
clever env set PORT=8080
clever env set APP_URL=https://zerologementvacant.beta.gouv.fr

# Authentification
clever env set AUTH_SECRET=<votre-secret-securise-32-chars-minimum>
clever env set AUTH_EXPIRES_IN=7d

# Email (Brevo)
clever env set BREVO_API_KEY=<votre-cle-api-brevo>

# Stockage S3 (Cellar)
clever env set S3_ENDPOINT=<cellar-endpoint>
clever env set S3_ACCESS_KEY_ID=<cellar-key>
clever env set S3_SECRET_ACCESS_KEY=<cellar-secret>
clever env set S3_BUCKET=zlv-production

# Monitoring (Sentry)
clever env set SENTRY_DSN=<dsn-sentry>

# Python pour les scripts cron
clever env set CC_PYTHON_VERSION=3.11

# API Cerema (synchronisation des périmètres)
clever env set CEREMA_USERNAME=<username>
clever env set CEREMA_PASSWORD=<password>
```

**Note :** Les variables `POSTGRESQL_ADDON_*` et `REDIS_URL` sont automatiquement créées lors de la liaison des add-ons.

### 5.7 Configuration Clever Cloud

Les fichiers de configuration sont dans le dossier `clevercloud/` :

```
clevercloud/
├── cron.json           # Tâches planifiées
├── post_build.sh       # Script exécuté après le build
├── README.md           # Documentation
└── SETUP_CHECKLIST.md  # Checklist de configuration
```

#### Fichier cron.json (tâches planifiées)

```json
[
  "*/30 * * * * $ROOT/server/src/scripts/perimeters-portaildf/cerema-sync.sh",
  "0 3 1 * * $ROOT/server/src/scripts/logs/export-monthly-logs.sh"
]
```

**Explication de la syntaxe :**
- `*/30 * * * *` = toutes les 30 minutes
- `0 3 1 * *` = le 1er du mois à 3h du matin

#### Script post_build.sh

Ce script s'exécute après la compilation du code :

```bash
#!/bin/bash
# Installation des dépendances Python pour les scripts
echo "=== Installing Python dependencies ==="
pip3 install --user -r server/src/scripts/perimeters-portaildf/requirements.txt
echo "✓ Python dependencies installed"
```

### 5.8 Déployer

```bash
# Pousser le code vers Clever Cloud
git push clever main

# Ou déployer un commit spécifique
clever deploy --force <commit-sha>

# Suivre les logs de déploiement
clever logs -f
```

### 5.9 Checklist de déploiement

Avant de considérer le déploiement comme terminé :

- [ ] Variables d'environnement configurées
- [ ] Add-ons liés (PostgreSQL, Redis, Cellar)
- [ ] Migrations de base de données appliquées
- [ ] Certificats SSL valides (automatique sur Clever Cloud)
- [ ] Health checks fonctionnels
- [ ] Log drains configurés (vers Elasticsearch)
- [ ] Tâches cron enregistrées
- [ ] Sentry configuré pour le monitoring des erreurs

---

## 6. Services externes

### 6.1 Qu'est-ce qu'un service externe ?

Un service externe est une application tierce avec laquelle ZLV communique via des API. Chaque service a son propre compte et ses propres identifiants.

### 6.2 Brevo (Envoi d'emails)

**Rôle :** Envoyer des emails transactionnels (confirmation d'inscription, notifications, etc.)

**Configuration :**
1. Créer un compte sur https://www.brevo.com/
2. Obtenir une clé API dans les paramètres
3. Configurer la variable `BREVO_API_KEY`

**Tester que ça fonctionne :**
```bash
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: $BREVO_API_KEY"
```

### 6.3 Sentry (Suivi des erreurs)

**Rôle :** Capturer automatiquement les erreurs qui se produisent dans l'application et alerter l'équipe.

**Configuration :**
1. Créer un projet sur https://sentry.io/
2. Obtenir le DSN (Data Source Name) du projet
3. Configurer la variable `SENTRY_DSN`

### 6.4 API Cerema (Périmètres)

**Rôle :** Synchroniser les données de périmètres (intercommunalités, etc.) depuis le portail DataFoncier du Cerema.

**Configuration :**
1. Obtenir les identifiants API Cerema
2. Configurer les variables :
   - `CEREMA_USERNAME`
   - `CEREMA_PASSWORD`

**Tester l'authentification :**
```bash
curl -X POST https://portaildf.cerema.fr/api/api-token-auth/ \
  -d "username=$CEREMA_USERNAME" \
  -d "password=$CEREMA_PASSWORD"
```

### 6.5 BAN (Base Adresse Nationale)

**Rôle :** Géocoder les adresses (convertir une adresse en coordonnées GPS).

**Configuration :** Aucune ! L'API est publique et gratuite.

**Endpoint :** https://api-adresse.data.gouv.fr/

### 6.6 Cellar S3 (Stockage de fichiers)

**Rôle :** Stocker les fichiers uploadés (documents, exports, etc.).

Cellar est le service S3 de Clever Cloud, compatible avec l'API Amazon S3.

**Configuration :**
1. Créer un bucket dans Cellar (via le dashboard Clever Cloud)
2. Configurer les variables :
   - `S3_ENDPOINT`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET`

---

## 7. Vérifier l'installation

### 7.1 En développement local

#### Vérifier les conteneurs Docker

```bash
docker compose -f .docker/docker-compose.yml ps

# Tous les services doivent être "Up"
```

#### Vérifier la base de données

```bash
# Tester la connexion
psql $DATABASE_URL -c "SELECT 1"

# Vérifier les migrations
yarn workspace @zerologementvacant/server migrate:status
```

#### Vérifier les applications

```bash
# Backend
curl http://localhost:3001/api
# → { "status": "healthy" }

# Frontend
# → Ouvrir http://localhost:3000 dans le navigateur
```

### 7.2 En production

#### Health Check de l'API

```bash
curl -s https://zerologementvacant.beta.gouv.fr/api | jq .
# → { "status": "healthy" }
```

#### État sur Clever Cloud

```bash
clever status
clever activity | head -5
```

#### Vérifier les logs

```bash
clever logs | head -50
clever logs | grep -i error
```

---

## 8. Dépannage

### 8.1 Problèmes d'installation locale

#### Erreur : Mauvaise version de Node.js

```
error This project requires Node.js version 24.x.x
```

**Solution :**
```bash
nvm install 24
nvm use 24
node --version  # Vérifier
```

#### Erreur : Docker ne démarre pas

```
Cannot connect to the Docker daemon
```

**Solutions :**

Sur macOS :
```bash
# Ouvrir Docker Desktop
open -a Docker
```

Sur Linux :
```bash
# Démarrer le service Docker
sudo systemctl start docker
```

#### Erreur : PostgreSQL ne répond pas

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution :**
```bash
# Vérifier que Docker est démarré
docker compose -f .docker/docker-compose.yml up -d

# Vérifier l'état du conteneur PostgreSQL
docker compose -f .docker/docker-compose.yml ps postgres
```

#### Erreur : Migration déjà exécutée

```
Migration "xxx" has already been run
```

**Solution :**
```bash
# Vérifier l'état des migrations
yarn workspace @zerologementvacant/server migrate:status

# Si nécessaire, annuler la dernière
yarn workspace @zerologementvacant/server migrate:rollback
```

### 8.2 Problèmes en production

#### Déploiement bloqué

```bash
# Voir l'activité récente
clever activity

# Forcer un redéploiement propre
clever restart --without-cache
```

#### L'application ne démarre pas

```bash
# Consulter les logs de démarrage
clever logs | head -100

# Causes courantes :
# - Variable d'environnement manquante
# - Port incorrect (doit être 8080 sur Clever Cloud)
# - Erreur de build
```

#### Les tâches cron ne s'exécutent pas

1. Vérifier que `cron.json` est commité dans le repo
2. Vérifier les variables d'environnement nécessaires
3. Redéployer l'application

Pour tester manuellement un script :
```bash
clever ssh
/app/server/src/scripts/perimeters-portaildf/cerema-sync.sh
```

#### Python non trouvé (pour les scripts)

```bash
# Ajouter la variable
clever env set CC_PYTHON_VERSION=3.11

# Redéployer
clever restart
```

---

## 9. Aide-mémoire

### 9.1 Commandes de développement

```bash
# === INSTALLATION ===
yarn install                            # Installer les dépendances
docker compose -f .docker/docker-compose.yml up -d  # Démarrer Docker

# === DÉMARRER L'APPLICATION ===
yarn workspace @zerologementvacant/front dev    # Frontend (localhost:3000)
yarn workspace @zerologementvacant/server dev   # Backend (localhost:3001)
yarn workspace @zerologementvacant/queue dev    # Queue worker

# === TESTS ===
yarn test                               # Tous les tests
yarn nx test server                     # Tests du serveur
yarn nx test frontend                   # Tests du frontend

# === BASE DE DONNÉES ===
yarn workspace @zerologementvacant/server migrate        # Appliquer les migrations
yarn workspace @zerologementvacant/server migrate:status # Voir l'état
yarn workspace @zerologementvacant/server seed           # Charger les données de test

# === BUILD ===
yarn nx build frontend                  # Compiler le frontend
yarn nx build server                    # Compiler le serveur
```

### 9.2 Commandes Clever Cloud

```bash
# === CONNEXION ===
clever login                            # S'authentifier
clever link <app-id>                    # Se lier à une application

# === ÉTAT ===
clever status                           # État de l'application
clever activity                         # Historique des déploiements
clever logs -f                          # Logs en temps réel

# === DÉPLOIEMENT ===
git push clever main                    # Déployer la branche main
clever deploy --force <sha>             # Déployer un commit spécifique
clever restart                          # Redémarrer
clever restart --without-cache          # Redémarrer + vider le cache

# === ENVIRONNEMENT ===
clever env                              # Lister les variables
clever env set KEY=value                # Définir une variable
clever env rm KEY                       # Supprimer une variable

# === ACCÈS SSH ===
clever ssh                              # Se connecter au conteneur
```

### 9.3 Ports par défaut

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001/api |
| PostgreSQL | 5432 | postgres://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| Elasticsearch | 9200 | http://localhost:9200 |

### 9.4 Checklist d'installation complète

#### Développement local

- [ ] Node.js v24+ installé (`node --version`)
- [ ] Yarn v4 activé (`corepack enable`)
- [ ] Docker installé et démarré
- [ ] Repository cloné
- [ ] `yarn install` exécuté sans erreur
- [ ] Services Docker démarrés
- [ ] Fichiers `.env` créés (frontend, server, queue)
- [ ] Migrations appliquées
- [ ] Seed exécuté
- [ ] Frontend démarre (http://localhost:3000)
- [ ] Backend démarre (http://localhost:3001/api)
- [ ] Tests passent (`yarn test`)

#### Production (Clever Cloud)

- [ ] Application créée
- [ ] Add-ons liés (PostgreSQL, Redis, Cellar)
- [ ] Variables d'environnement configurées
- [ ] Déploiement réussi
- [ ] Health check OK
- [ ] Migrations appliquées
- [ ] Crons configurés
- [ ] Monitoring (Sentry) fonctionnel
- [ ] SSL valide

---

## 10. Ressources et liens utiles

### 10.1 URLs du projet

| Ressource | URL |
|-----------|-----|
| **Code source** | https://github.com/MTES-MCT/zero-logement-vacant |
| **Fiche produit** | https://beta.gouv.fr/startups/zero-logement-vacant.html |
| **Production** | https://zerologementvacant.beta.gouv.fr |
| **Staging** | https://zerologementvacant-staging.incubateur.net |
| **CI/CD** | https://github.com/MTES-MCT/zero-logement-vacant/actions |

### 10.2 Documentation

| Document | Description |
|----------|-------------|
| **DAT** | Dossier d'Architecture Technique - architecture du système |
| **DE** | Dossier d'Exploitation - procédures opérationnelles |
| **CLAUDE.md** | Guide de développement (racine du projet) |
| **API Swagger** | http://localhost:3001/api-docs (développement) |

### 10.3 Outils

| Outil | URL | Usage |
|-------|-----|-------|
| **Vaultwarden** | https://vaultwarden.incubateur.net/ | Mots de passe partagés |
| **Clever Cloud** | https://console.clever-cloud.com | Console d'administration |
| **Sentry** | https://sentry.io | Monitoring des erreurs |

---

## Glossaire

| Terme | Définition |
|-------|------------|
| **Add-on** | Service géré par Clever Cloud (PostgreSQL, Redis, etc.) |
| **API** | Interface de programmation permettant à des applications de communiquer |
| **Build** | Compilation du code source en code exécutable |
| **CLI** | Command Line Interface - outil en ligne de commande |
| **Conteneur** | Environnement isolé qui contient une application et ses dépendances |
| **Dépendance** | Bibliothèque externe utilisée par le code |
| **Déploiement** | Mise en ligne d'une nouvelle version de l'application |
| **Docker** | Outil pour créer et gérer des conteneurs |
| **Docker Compose** | Outil pour orchestrer plusieurs conteneurs ensemble |
| **Endpoint** | URL à laquelle une API est accessible |
| **Git** | Système de gestion de versions du code |
| **Health Check** | Vérification que l'application fonctionne |
| **Migration** | Script qui modifie la structure de la base de données |
| **Monorepo** | Un seul repository contenant plusieurs projets |
| **Node.js** | Environnement d'exécution JavaScript côté serveur |
| **nvm** | Node Version Manager - gestionnaire de versions Node.js |
| **PaaS** | Platform as a Service - plateforme d'hébergement gérée |
| **Seed** | Données initiales chargées dans la base pour les tests |
| **Variable d'environnement** | Paramètre de configuration externe au code |
| **Workspace** | Sous-projet dans un monorepo |
| **Yarn** | Gestionnaire de packages JavaScript |

---

*Document mis à jour le 26 février 2026*
