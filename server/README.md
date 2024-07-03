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
