# zero-logement-vacant

[![End-to-end tests](https://github.com/MTES-MCT/zero-logement-vacant/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/MTES-MCT/zero-logement-vacant/actions/workflows/e2e.yml)
[![codecov](https://codecov.io/gh/MTES-MCT/zero-logement-vacant/graph/badge.svg?token=B35SRUWNI7)](https://codecov.io/gh/MTES-MCT/zero-logement-vacant)

[Fiche produit](https://beta.gouv.fr/startups/zero-logement-vacant.html)

## Getting started en 5 minutes

### Prérequis

- **Node.js v24+**
- **Yarn v4** (activé via Corepack : `corepack enable`)
- **Docker** (pour PostgreSQL, Redis, etc.)

### Installation de l'application

```bash
git clone https://github.com/MTES-MCT/zero-logement-vacant.git

cd zero-logement-vacant && yarn
```

### Sécurité des dépendances

1. Installation de `npq` (compatible Yarn)

Installer `npq` globalement :

```bash
brew install npq
```

Vous pouvez créer un alias pour que chaque commande `yarn add` passe automatiquement par `npq-hero` :

```bash
alias yarn="NPQ_PKG_MGR=yarn npq-hero"
```

2. Pour ajouter une nouvelle dépendance avec vérification de sécurité :

```bash
npx npq install package-name
```

npq effectue des vérifications (vulnérabilités Snyk, âge du package, scripts d'installation suspects) avant l'installation.

### Lancement des dépendances

Pour lancer les services, migrer et remplir la base de données en une seule
commande :

```shell
export DEV_DB=postgres://postgres:postgres@localhost/dev
export TEST_DB=postgres://postgres:postgres@localhost/test
bash .docker/setup.sh
```

Lancer **tous les services** :

```shell
docker compose -f .docker/docker-compose.yml up -d
```

Lancer **un service spécifique** :

```shell
docker compose -f .docker/docker-compose.yml up -d <service>
```

### Variables d’environnement

Chaque application définit ses propres variables d’environnement. Copiez les fichiers d’exemple et adaptez-les :

```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
```

**Important :** la valeur de `DATABASE_URL` dans `server/.env` doit correspondre à la base de données créée à l’étape précédente. Si vous avez utilisé les valeurs par défaut du script `setup.sh`, mettez à jour la valeur :

```
DATABASE_URL=postgres://postgres:postgres@localhost/dev
```

### Chargement des données

**Développement / Staging**

Si vous avez choisi de ne pas charger les données via `docker compose`, vous
pouvez les charger manuellement :

```bash
yarn nx run server:migrate
yarn nx run server:seed
```

**Note :** vous pouvez définir la variable d’environnement `DATABASE_URL`
pour utiliser une base de données spécifique.
Sinon une base de donnée locale sera utilisée par défaut.
La base de données **doit exister**.

Permet le chargement de données minimales pour faire fonctionner l'application avec des données anonymisées pour les collectivités suivantes :

- Eurométropole de Strasbourg
- CA Saint-Lô Agglo

et quatre utilisateurs dont les mots de passe sont partagés sur https://vaultwarden.incubateur.net/ :

- test.strasbourg@zlv.fr => utilisateur avec des droits pour Eurométropole de Strasbourg
- test.saintlo@zlv.fr => utilisateur avec des droits pour Saint-Lô
- test.admin@zlv.fr => utilisateur avec des droits d'administration
- test.visitor@zlv.fr => utilisateur lecture seule France entière

### Lancement de l'application en local

Chaque application peut être lancée indépendamment.

```shell
yarn nx run-many -t dev -p front,server
# Front est sur localhost:3000
# API est sur localhost:3001
```

L'application est accessible à l'adresse sur <http://localhost:3000> et il est possible de se connecter avec l'un des quatre comptes utilisateurs cités plus haut.

### Lancement des tests

Lancer tous les tests :

```shell
yarn test
```

Lancer les tests d’un workspace en particulier :

```shell
yarn nx test server
yarn nx test front
```

La commande échoue si le package ne comporte pas de commande `test`, ou si un
test échoue.

## Documentation

- [Génération de PDF](docs/guides/pdf.md) — courriers de campagne (agents produit)
- [packages/pdf](packages/pdf/README.md) — documentation technique du package PDF
