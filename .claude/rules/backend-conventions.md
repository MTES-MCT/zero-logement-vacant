---
description: Backend-specific directives for the Express API
paths: ["server/**"]
---

# Backend Conventions

## Implementation order — mandatory
Router → Controller test → Controller → Repository test → Repository

## Validation
- Always in routers, never in controllers.
- Use `validator.validate()` with Yup schemas.
- Never use express-validator for new code (legacy).
- Property-based tests mandatory for all schemas (`@fast-check/vitest`).

## Controllers
- Naming: `list`, `get`, `create`, `update`, `remove`.
- No try-catch — throw custom `HttpError` subclasses.
- Use `constants` from `node:http2` for status codes, never raw numbers.

## Repositories
- Use Kysely query builder (`~/infra/database/kysely`). Never raw SQL in repositories — use `sql` template tags only when a Kysely builder genuinely cannot express the query.
- Soft deletes: filter inline, e.g. `.where('table.deletedAt', 'is', null)`. There is no Kysely equivalent of the old Knex `notDeleted()` helper — don't reintroduce one.
- Transactions: `startKyselyTransaction()` in controllers, `withinKyselyTransaction()` in repos. Never start transactions in repositories.
- Knex (`~/infra/database` default export) is legacy. Every repository and service is now on Kysely — do not add new Knex usage. The only remaining Knex query calls are: primitive table accessors in not-yet-migrated **controller** (`*-api.test.ts`) tests, migrations/seeds, and the import-lovac ETL scripts (`src/scripts/import-lovac/`), which stay on Knex by design and are out of scope. See `docs/superpowers/plans/*kysely*` for the migration history.

## Testing
- API tests: `controllers/test/*-api.test.ts` with supertest.
- **Setup** persists through the Kysely test factories (`~/test/factories`): `await factories.owner.create({ ...overrides })`, `factories.housing.createList(n)`, `factories.housingOwner({ housing, owner }).create({ rank })`, `factories.campaign(establishment)/group(establishment).create({}, { associations: { createdBy: user } })`. Same engine as production. For rows with no factory (link tables like `campaignsHousing`/`groupsHousing`, raw-column edge cases, bulk >100 rows), use `kysely.insertInto('<table>').values(...)` with the exported camel `toXInsert` mappers (`toOwnerInsert`, `toHousingInsert`, …).
- **Ground truth**: read/assert with `kysely.selectFrom(...)` (never the repository under test), using **camelCase** column names. Do NOT use the Knex table accessors (`Owners()`, `Housings()`) — the repository tests (`repositories/test/*.test.ts`) have been migrated off them; only legacy controller tests and seeds still use them, and no new usage should be added.
- Objects passed AS INPUT to the method under test keep their `gen*Api()` generator and are NOT pre-persisted via a factory (the method under test creates them; the ground-truth read then verifies).
- Fixtures extend `gen*DTO()` from `@zerologementvacant/models`.

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| express-validator | validator (Yup) |
| try-catch in controllers | Throw `HttpError` subclass |
| Direct Knex in controllers | Repositories |
| Transactions in repositories | `startKyselyTransaction()` in controllers |
| `startTransaction()` (Knex+Kysely bridge) | `startKyselyTransaction()` |
| Raw HTTP status numbers | `constants.HTTP_STATUS_*` from `node:http2` |
| Knex query builder in repositories | Kysely query builder |
| `notDeleted()` helper | Inline `.where('table.deletedAt', 'is', null)` |
| `withinTransaction()` (Knex) in repos | `withinKyselyTransaction()` in repos |
| Knex table accessors in repo tests (`Owners().insert/where`) | Factories for setup + `kysely.selectFrom()` for ground-truth |
