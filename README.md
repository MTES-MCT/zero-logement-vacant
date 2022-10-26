# zero-logement-vacant

[Fiche produit](https://beta.gouv.fr/startups/zero-logement-vacant.html)

## Développement

### Prérequis

* node
* npm 
* serveur Postgres (sur macOS, possible d'utiliser [postgresapp](https://postgresapp.com>))
* commande psql dans le PATH (pour le chargement des données)
* serveur mail (par exemple [mailDev](https://github.com/maildev/maildev))

### Base de données

Créer une base de données vide pour l'application (par exemple `zlv`) et une autre pour les tests (par exemple `test_zlv`).

La création des tables et autres structures SQL se fera automatiquement lors du lancement de l'application via les migrations [KnexJS](http://knexjs.org/#Migrations) contenues dans le répertoire `/database/migrations` 

#### Avec Docker compose
```bash
cd .docker
# Crée un service db (postgres + extension postgis)
# et un service mail (maildev)
DATABASE_URL=postgres://postgres@postgres@localhost/zlv bash setup.sh
```

### Installation de l'application

```bash
git clone https://github.com/MTES-MCT/zero-logement-vacant.git

cd zero-logement-vacant
npm i

cd frontend
npm i
```

### Variables d'environnement

Créer un fichier `.env` directement dans le répertoire `zero-logement-vacant` avec à minima les variables suivantes :

```
DATABASE_URL=postgres://user@localhost/zlv
DATABASE_URL_TEST=postgres://user@localhost/test_zlv

AUTH_SECRET=secret

MAILER_HOST=localhost
MAILER_PORT=1025
MAILER_USER=
MAILER_PASSWORD=
```

Il est également possible dans ce fichier `.env` de surcharger les valeurs par défaut des autres variables d'environnement définies dans `/server/utils/config.ts`


### Chargement des données

**Développement / Staging**

```bash
npm run migrate-latest
cd database/scripts
psql [DATABASE_URL] -f 001-load-establishments-localities.sql -v filePath=../data/common/epci.csv
psql [DATABASE_URL] -f 002-load-data.sql -v filePath=../data/dummy/dummy_data.csv -v dateFormat="'MM/DD/YY'"
npm run seed
```

Permet le chargement de données minimales pour faire fonctionner l'application avec des données anonymisées pour les collectivités suivantes :
- Eurométropole de Strasbourg
- CA Saint-Lô Agglo

et trois utilisateurs :
- test.strasbourg@zlv.fr / test => utilisateur avec des droits pour Eurométropole de Strasbourg
- test.saintlo@zlv.fr / test => utilisateur avec des droits pour Saint-Lô
- test.admin@zlv.fr / test => utilisateur avec des droits d'administration

**Production**

Le chargement des données se fait à partir de fichier d'extractions de données au format csv.

```bash
cd database/scripts
psql [DATABASE_URL] -f 001-load-establishments-localities.sql -v filePath=../data/common/epci.csv
psql [DATABASE_URL] -f 002-load-data.sql -v filePath=[DATA_CSV_FILE] -v dateFormat=[DATE_FORMAT]
psql [DATABASE_URL] -f 003-load-buildings.sql -v filePath=[BUILDING_CSV_FILE]
npm run seed
```

### Lancement de l'application en local

```bash
npm run start-local
```

L'application est accessible à l'adresse sur <http://localhost:3000>

### Lancement des tests

**Frontend**

```bash
npm run frontend:test
```

Tests e2e
```bash
export CYPRESS_API_URL=http://localhost:3001
export CYPRESS_USER_EMAIL=test.saintlo@zlv.fr
export CYPRESS_USER_PASSWORD=...
export CYPRESS_BASE_URL=http://localhost:3000

# Avec UI
npx cypress open 
# Sans UI
npx cypress run --e2e
```

**Backend**

```bash
npm run test
```

## Démo

La version de démo de l'application est accessible à l'adresse <https://zerologementvacant-staging.incubateur.net>

## Production

La version de production de l'application  est accessible à l'adresse <https://zerologementvacant.beta.gouv.fr>
