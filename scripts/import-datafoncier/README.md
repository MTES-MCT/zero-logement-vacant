# Import Datafoncier

## Why

This script is used to import housing and owners from [Datafoncier](https://doc-datafoncier.cerema.fr/doc/ff/).

A Datafoncier owner is **by department** while our owner is **national**.
Thus, a national owner can be linked to multiple Datafoncier owners, one for
each department they own a housing in.

## What

We receive an SQL file from Datafoncier each year.
It must be **imported** in the database first.

This is a manual step where a developer retrieves the link and restores the file
in the database. When the restore is complete, the imported tables must be
renamed according to the year of the data e.g. `df_owners_nat_2024` or
`df_housing_nat_2024`.

See [ansible playbook](../../tools/import-raw-datafoncier/README.md).

### Using an SQL dump

You must provide two dumps from the Datafoncier owner and housing tables.

```shell
psql -v ON_ERROR_STOP=1 $(scalingo -a zerologementvacant env-get DATABASE_URL) -f datafoncier-owners.sql
psql -v ON_ERROR_STOP=1 $(scalingo -a zerologementvacant env-get DATABASE_URL) -f datafoncier-housing.sql
```

To run the script:

```shell
# In local dev
ts-node scripts/import-datafoncier
# In production
scalingo -a zerologementvacant run --detached --size XL "npm i --production=false && export DATABASE_ENV=production && ./node_modules/.bin/ts-node scripts/import-datafoncier"
```

## How

### Retrieval

The script retrieves the Datafoncier owners one by one and tries to find
an existing owner in our database.

If an owner is found in our database, we skip it.

Otherwise, the script checks for duplicates by name (string equality)
and evaluates the similarity between the Datafoncier owner and our owner.

### Evaluation

The Datafoncier owner is compared to each duplicate with the same name found
in our database. The evaluation compares addresses between owners
and computes a score between 0 and 1.

If it's a **perfect match** (i.e., the score from the evaluate function is 1),
we can safely assume that the owner is the same, and we can link the Datafoncier
owner to the existing national owner in our database.

If it's a **match** (i.e., the score from the evaluate function is between
0.85 and 1), we can assume that the owner is the same, but we need to check
whether the comparison needs human review.

A match *needs review* if any of these conditions are met:
- each match is a **review match** (i.e., the score from the evaluate function
is between 0.70 and 0.85)
- the source and duplicates that match have at least two birthdates filled and
different

If it's a **no match** (i.e., the score from the evaluate function is below 0.7),
we can assume that the owner is not the same, and we need to create a new owner
in our database. The link between the Datafoncier owner and the new owner is
created as well.

## When

Each year. Or whenever needed.
