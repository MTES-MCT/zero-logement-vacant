## How to

### Create a migration

```shell
yarn workspace @zerologementvacant/server knex seed:make \
  --knexfile=src/infra/database/knexfile.ts \
  --env=development \
  <name>
```

Knex will create a seed file in `src/infra/database/seeds` with the name
`<timestamp>_<name>.ts`.

## Required PostgreSQL Extensions

This project relies on the following PostgreSQL extensions to enhance database functionality:

- **uuid-ossp**: Enables the generation of universally unique identifiers (UUIDs), useful for creating unique keys across distributed systems.
- **postgis**: Adds spatial database capabilities for managing and querying geographic data, enabling advanced geospatial queries (owners and housings).
- **unaccent**: Provides functionality to remove accents from strings, improving search flexibility. To ensure efficient usage with indexed text searches, define an immutable wrapper function:

```sql
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
SELECT unaccent($1)
$$ LANGUAGE sql IMMUTABLE STRICT;
```

- **pg_trgm**: Supports similarity and trigram-based text searches. It is particularly effective for fuzzy string matching and partial text search. To optimize full-text searches, create an index using:

```sql
CREATE INDEX IF NOT EXISTS owners_full_name_trgm_idx
ON owners
USING GIN (immutable_unaccent(full_name) gin_trgm_ops);
```

Ensure these extensions are installed and activated in your PostgreSQL database using CREATE EXTENSION IF NOT EXISTS extension_name;.
