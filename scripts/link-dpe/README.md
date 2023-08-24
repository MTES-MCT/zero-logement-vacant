## Usage

### Requirements

The plot ids of concerned housing must be completed on the table.
<br/>If they are not completed, it can be done by the following SQL commands (from the Scalingo console by example `scalingo -a my-app pgsql-console`)
```shell
create index zlv_logt_epci_idlocal_index
    on public.zlv_logt_epci (idlocal);
update housing h
set plot_id = (select idpar from zlv_logt_epci e where h.local_id = e.idlocal);
```

### Use
The department code must be passed as an argument 

```shell

# In local dev
ts-node scripts/link-dpe [DEP]
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/link-dpe [DEP]"
```
