## Usage

### Using an SQL dump

You must provide two dumps from the Datafoncier owner and housing tables.

```shell
psql -v ON_ERROR_STOP=1 postgres://... -f datafoncier-owners.sql
psql -v ON_ERROR_STOP=1 postgres://... -f datafoncier-housing.sql

# In local dev
ts-node scripts/import-lovac
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/import-lovac
```

## TODO

- [ ] Use the given geo codes to filter which housing should be imported
