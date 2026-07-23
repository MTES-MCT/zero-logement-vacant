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
- Transactions: `startTransaction()` in controllers, `withinKyselyTransaction()` in repos. Never start transactions in repositories.
- Knex (`~/infra/database` default export) is legacy and being phased out repository-by-repository. Do not add new Knex usage. See `docs/superpowers/plans/*kysely*` for the migration sequencing and the per-repository characterization-test-then-migrate process.

## Testing
- API tests: `controllers/test/*-api.test.ts` with supertest.
- Assert with primitive table accessors (`Events()`, `Housings()`), not the repository under test. These accessors intentionally stay on raw Knex query builders for now — they're test-only ground-truth reads/writes, not production code paths, so they're out of scope for the Kysely migration.
- Fixtures extend `gen*DTO()` from `@zerologementvacant/models`.

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| express-validator | validator (Yup) |
| try-catch in controllers | Throw `HttpError` subclass |
| Direct Knex in controllers | Repositories |
| Transactions in repositories | `startTransaction()` in controllers |
| Raw HTTP status numbers | `constants.HTTP_STATUS_*` from `node:http2` |
| Knex query builder in repositories | Kysely query builder |
| `notDeleted()` helper | Inline `.where('table.deletedAt', 'is', null)` |
| `withinTransaction()` (Knex) in repos | `withinKyselyTransaction()` in repos |
