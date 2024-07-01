# zero-logement-vacant IGEDD

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

### Installation de Postgres avec Docker

Voici comment lancer Postgres avec l'extension PostGIS dans un conteneur Docker sur votre machine locale avec Docker:

```bash
docker run --name zlv-postgres -e POSTGRES_PASSWORD=zlv -p 5432:5432 -d postgis/postgis
```

### Installation de mailDev avec Docker

MailDev est un outil de test SMTP simple pour les développeurs. Il permet de capturer et de visualiser les emails envoyés pendant le développement d'applications sans avoir besoin de les envoyer à un serveur de mail réel. Voici comment lancer MailDev dans un conteneur Docker sur votre machine locale avec Docker:

```bash
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

Les emails seront consultables sur `http://0.0.0.0:1080/#/`

#### Avec Docker compose

Nous utilisons Docker Compose pour configurer et lancer trois services essentiels : une base de données PostgreSQL avec l'extension PostGIS, un service de mail pour le développement avec MailDev, ainsi qu'Adminer, un outil de gestion de base de données via une interface web. Voici comment déployer ce conteneur en local:

```bash
cd .docker

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

Pour configurer votre environnement, commencez par créer un fichier nommé `.env` au sein du dossier `zero-logement-vacant`, en prenant exemple sur le contenu de `.env.example`.

Vous avez également la possibilité de personnaliser les valeurs des variables d'environnement déjà définies dans le fichier `/server/utils/config.ts` en les ajustant dans ce même fichier `.env`.

De plus, créez un fichier .env dans le sous-dossier `zero-logement-vacant/frontend`, en vous référant à nouveau à `zero-logement-vacant/frontend/.env.example` pour guider sa structure.

### Chargement des données

**Développement / Staging**

```bash
npm run migrate-latest
cd database/scripts
psql [DATABASE_URL] -f 001-load-establishments_com_epci_reg_dep.sql -v filePath=../data/common/com_epci_dep_reg.csv
psql [DATABASE_URL] -f 002-load-establishments_direction_territoriale.sql -v filePath=../data/common/direction_territoriale.csv
psql [DATABASE_URL] -f 003-load-establishment_kinds.sql -v filePath=../data/common/nature_juridique.csv
psql [DATABASE_URL] -f 004-load-data.sql -v filePath=../data/dummy/dummy_data.csv -v dateFormat="'MM/DD/YY'"
psql [DATABASE_URL] -f 006-load-locality-taxes.sql -v filePath=../data/common/taxe.csv
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
psql [DATABASE_URL] -f 001-load-establishments_com_epci_reg_dep.sql -v filePath=../data/common/com_epci_dep_reg.csv
psql [DATABASE_URL] -f 002-load-establishments_direction_territoriale.sql -v filePath=../data/common/direction_territoriale.csv
psql [DATABASE_URL] -f 003-load-establishment_kinds.sql -v filePath=../data/common/nature_juridique.csv
psql [DATABASE_URL] -f 004-load-data.sql -v filePath=[DATA_CSV_FILE] -v dateFormat=[DATE_FORMAT]
psql [DATABASE_URL] -f 005-load-buildings.sql -v filePath=[BUILDING_CSV_FILE]
psql [DATABASE_URL] -f 006-load-locality-taxes.sql -v filePath=../data/common/taxe.csv
npm run seed
```

### Lancement de l'application en local

```bash
npm run start-local
```

L'application est accessible à l'adresse sur <http://localhost:3000> et il est possible de se connecter avec l'un des trois comptes utilisateurs cités plus haut.

### Lancement des tests

**Frontend**

```bash
npm run frontend:test
```

**Backend**

```bash
npm run test
```

## Démo

La version de démo de l'application est accessible à l'adresse <https://zerologementvacant-staging.incubateur.net>

## Production

La version de production de l'application  est accessible à l'adresse <https://zerologementvacant.beta.gouv.fr>
