# zero-logement-vacant

## Développement

### Prérequis

* node
* npm 
* serveur Postgres (sur macOS, possible d'utiliser https://postgresapp.com)

### Installation

```bash
git clone https://github.com/MTES-MCT/zero-logement-vacant.git

cd zero-logement-vacant
npm i

cd frontend
npm i
```

### Variables d'environnement

Créer un fichier .env directement dans le répertoire zero-logement-vacant avec à minima les variables suivantes :

```
DATABASE_URL=
DATABASE_URL_TEST=

MAILER_HOST=
MAILER_PORT=
MAILER_USER=
MAILER_PASSWORD=
```

Il est possible également dans ce fichier .env de surcharger les valeurs par défaut des autres variables d'environnement définies dans /server/utils/config.ts

### Lancement en local

```bash
npm start-local
```

Accéder au site sur <http://localhost:3000>


## Démo

La version de démo de l'application est accessible à l'adresse <https://zerologementvacant-staging.incubateur.net>

## Production

L'application de production de l'application  est accessible à l'adresse <https://zerologementvacant.beta.gouv.fr>
