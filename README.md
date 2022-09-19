# zero-logement-vacant

[Fiche produit](https://beta.gouv.fr/startups/zero-logement-vacant.html)

## Développement

### Prérequis

* node
* npm 
* serveur Postgres (sur macOS, possible d'utiliser [postgresapp](https://postgresapp.com>))
* serveur mail (par exemple [mailDev](https://github.com/maildev/maildev))

### Base de données

Créer une base de données vide pour l'application (par exemple `zlv`) et une autre pour les tests (par exemple `test_zlv`).

La création des tables et autres structures SQL se fera automatiquement lors du lancement de l'application via les migrations [KnexJS](http://knexjs.org/#Migrations) contenues dans le répertoire `/database/migrations` 

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

### Installation de l'application

```bash
git clone https://github.com/MTES-MCT/zero-logement-vacant.git

cd zero-logement-vacant
npm i

cd frontend
npm i
```


### Chargement des données

**Développement**

```bash
npm run seeds
```

Permet le chargement de données minimales pour faire fonctionner l'application avec des données anonymisées pour les collectivités suivantes :
- Eurométropole de Strasbourg
- CA Saint-Lô Agglo

et trois utilisateurs :
- test.strasbourg@zlv.fr / test => utilisateur avec des droits pour Eurométropole de Strasbourg
- test.saintlo@zlv.fr / test => utilisateur avec des droits pour Saint-Lô
- test.admin@zlv.fr / test => utilisateur avec des droits d'administration

**Production**

Les scripts présents dans le répertoire `database/seed/production` sont éxécutés automatiquement à chaque déploiement de l'application. 
Ils permettent de (re)charger automatiquement les données publiques (collectivités, ...)

Le chargement des données privées se fait à partir de fichier de données CSV via les procédures :
- load_data(csv_path text) 
- load_buildings(csv_path text)


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

**Backend**

```bash
npm run test
```

## Démo

La version de démo de l'application est accessible à l'adresse <https://zerologementvacant-staging.incubateur.net>

## Production

La version de production de l'application  est accessible à l'adresse <https://zerologementvacant.beta.gouv.fr>
