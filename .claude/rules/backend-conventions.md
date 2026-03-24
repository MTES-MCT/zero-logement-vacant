---
description: Backend-specific directives for the Express API
paths: ["server/**"]
---

# Backend Conventions

## Implementation order — mandatory
Router → Controller test → Controller → Repository test → Repository

## Validation
- Always in routers, never in controllers.
- Use `validatorNext.validate()` with Yup schemas.
- Never use express-validator for new code (legacy).
- Property-based tests mandatory for all schemas (`@fast-check/vitest`).

## Controllers
- Naming: `list`, `get`, `create`, `update`, `remove`.
- No try-catch — throw custom `HttpError` subclasses.
- Use `constants` from `node:http2` for status codes, never raw numbers.

## Repositories
- Use Knex query builder. Never raw SQL in repositories.
- Always apply `notDeleted()` for soft deletes.
- Transactions: `startTransaction()` in controllers, `withinTransaction()` in repos. Never start transactions in repositories.

## Migrations
- Always create migration files with `yarn workspace @zerologementvacant/server db migrate:make <name>` — never create them manually. This ensures the timestamp in the filename is correct.

## Testing
- API tests: `controllers/test/*-api.test.ts` with supertest.
- Assert with primitive table accessors (`Events()`, `Housings()`), not the repository under test.
- Fixtures extend `gen*DTO()` from `@zerologementvacant/models`.

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| express-validator | validatorNext (Yup) |
| try-catch in controllers | Throw `HttpError` subclass |
| Direct Knex in controllers | Repositories |
| Transactions in repositories | `startTransaction()` in controllers |
| Raw HTTP status numbers | `constants.HTTP_STATUS_*` from `node:http2` |
