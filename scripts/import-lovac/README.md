## Usage

### Copying production data (optional, to work on your machine)
TODO

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

### Import the CSV file into the database
```shell
psql $(scalingo -a <app> env-get DATABASE_URL) -f database/scripts/009-load-lovac-2023.sql -v filePath=<path-to-lovac-2023.csv> -v dateFormat="'DD/MM/YY'"
```

### Run the script
```shell
ts-node scripts/import-lovac
```
