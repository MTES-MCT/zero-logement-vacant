## Usage

### Requirements

The plot ids of concerned housing must be completed on the table.  
If they are not completed, it can be done by the following SQL commands

```shell
update fast_housing h
  set plot_id = (select idpar from df_housing_nat e where h.local_id = e.idlocal) where plot_id is null;

update fast_housing h
  set plot_id = (select distinct(ff_idpar) from _extract_zlv_ e where h.local_id = e.ff_idlocal) where plot_id is null;
```

### Use
The department codes must be passed separated by commas as a unique argument
(01,08,14).  
When no argument is passed, the script handles all the departments by default.

```shell
# In local dev
ts-node scripts/link-dpe [DEPS]
```
