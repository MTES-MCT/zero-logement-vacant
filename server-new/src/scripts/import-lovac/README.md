## Usage

### Copying production data (optional, to work on your machine)
```shell
pg_dump --clean --if-exists --format c --dbname $(scalingo -a zerologementvacant env-get DATABASE_URL) --no-owner --no-privileges --no-comments --exclude-schema 'information_schema' --exclude-schema '^pg_*' --file zlv-prod.pgsql
pg_restore --clean --if-exists --no-owner --no-privileges --no-comments --dbname postgres://postgres:postgres@localhost zlv-prod.pgsql --verbose
```

### Remove duplicates to avoid conflicts
```shell
psql $(scalingo -a <app> env-get DATABASE_URL) -f database/scripts/008-deduplicate.sql
```

### Migrate the database if needed
```shell
npm run migrate-latest
```

Note that you should migrate the database after removing the duplicates,
because they might conflict with a unique constraint added by a migration.

### Create the user Lovac 2023 if needed
```shell
knex seed:run --specific=004-users.ts --knexfile=./server/knex.ts
```

### Import the CSV file into the database
```shell
psql $(scalingo -a <app> env-get DATABASE_URL) -f database/scripts/009-load-lovac-2023.sql -v filePath=<path-to-lovac-2023.csv> -v dateFormat="'DD/MM/YY'"
```

### Run the script
```shell
ts-node scripts/import-lovac
```
