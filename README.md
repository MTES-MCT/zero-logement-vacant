# zero-logement-vacant

[![End-to-end tests](https://github.com/MTES-MCT/zero-logement-vacant/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/MTES-MCT/zero-logement-vacant/actions/workflows/e2e.yml)

[Fiche produit](https://beta.gouv.fr/startups/zero-logement-vacant.html)

## Getting started en 5 minutes

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

### Variables d'environnement

Chaque application peut définir ses propres variables d’environnement.
Des exemples sont disponibles comme ici pour l’API : [server/.env.example](server/.env.example).

### Chargement des données

**Développement / Staging**

Si vous avez choisi de ne pas charger les données via `docker compose`, vous
pouvez les charger manuellement :

```bash
yarn workspace @zerologementvacant/server migrate
yarn workspace @zerologementvacant/server seed
```

**Note :** vous pouvez définir la variable d’environnement `DATABASE_URL`
pour utiliser une base de données spécifique.
Sinon une base de donnée locale sera utilisée par défaut.
La base de données **doit exister**.

Permet le chargement de données minimales pour faire fonctionner l'application avec des données anonymisées pour les collectivités suivantes :

- Eurométropole de Strasbourg
- CA Saint-Lô Agglo

et trois utilisateurs dont les mots de passes sont partagés sur https://vaultwarden.incubateur.net/:

- test.strasbourg@zlv.fr => utilisateur avec des droits pour Eurométropole de Strasbourg
- test.saintlo@zlv.fr => utilisateur avec des droits pour Saint-Lô
- test.admin@zlv.fr => utilisateur avec des droits d'administration
- test.visitor@zlv.fr => utilisateur lecture seule France entière

### Lancement de l'application en local

Chaque application peut être lancée indépendamment.

```shell
yarn workspace @zerologementvacant/front dev # localhost:3000
yarn workspace @zerologementvacant/server dev # localhost:3001/api
```

L'application est accessible à l'adresse sur <http://localhost:3000> et il est possible de se connecter avec l'un des trois comptes utilisateurs cités plus haut.

### Lancement des tests

Lancer tous les tests :

```shell
yarn test
```

Lancer les tests d’un workspace en particulier :

```shell
# Avec yarn
yarn workspace <workspace> test
# Avec lerna
yarn lerna run test --scope <workspace> [--include-dependents]

# Exemple
yarn workspace @zerologementvacant/server test
yarn lerna run test --scope @zerologementvacant/server --include-dependents
yarn test --scope @zerologementvacant/server --include-dependents
# yarn test == yarn lerna run test
```

La commande échoue si le package ne comporte pas de commande `test`, ou si un
test échoue.

## Démo

La version de démo de l'application est accessible à l'adresse <https://zerologementvacant-staging.incubateur.net>

## Production

La version de production de l'application est accessible à l'adresse <https://zerologementvacant.beta.gouv.fr>
