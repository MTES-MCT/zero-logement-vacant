## Usage

### Using an SQL dump

You must provide two dumps from the Datafoncier owner and housing tables.

```shell
psql -v ON_ERROR_STOP=1 postgres://... -f datafoncier-owners.sql
psql -v ON_ERROR_STOP=1 postgres://... -f datafoncier-housing.sql

# In local dev
ts-node scripts/import-poorly-insulated-housing
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/import-poorly-insulated-housing"
```

### Partial use

The script contains 5 steps called : 
1. Preprocess
2. ImportOwners
3. LinkOwners
4. ImportHousing
5. CleanUp

It is possible to run only some of them by passing their names, separated by a comma, as an argument of the command line 

```shell
# In local dev
ts-node scripts/import-poorly-insulated-housing ImportHousing,CleanUP
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/import-poorly-insulated-housing ImportHousing,CleanUP"
```

## TODO

- [ ] Use the given geo codes to filter which housing should be imported

