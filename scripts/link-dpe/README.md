## Usage

### Requirements

The plot ids of concerned housing must be completed on the table.
<br/>If they are not completed, it can be done by the following SQL commands (from the Scalingo console by example `scalingo -a my-app pgsql-console`)
```shell
create index zlv_logt_epci_idlocal_index
    on public.zlv_logt_epci (idlocal);

update fast_housing h
  set plot_id = (select idpar from zlv_logt_epci e where h.local_id = e.idlocal) where plot_id is null;

update fast_housing h
  set plot_id = (select distinct(ff_idpar) from _extract_zlv_ e where h.local_id = e.ff_idlocal) where plot_id is null;
```

### Use
The department codes must be passed separated by commas as a unique argument (01,08,14,15,17,22,24,28,36,37,38,43,54,50,54,55,59,61,62,69,71,75,76,85)
When no argument is passed, the script handle all the departments by default

```shell

# In local dev
ts-node scripts/link-dpe [DEPS]
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/link-dpe [DEPS]"
```
