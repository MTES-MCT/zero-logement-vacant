# Remove `/api` prefix from API routes

**Date:** 2026-05-11
**Branch:** `refactor/remove-api-prefix`
**Approach:** Option A — single atomic PR

## Context

The server is deployed on a dedicated `api.*` subdomain (e.g., `api.zerologementvacant.beta.gouv.fr`). The `/api` path prefix on every route is therefore redundant — the subdomain already signals that requests are going to the API. This change removes it.

## Scope

Three categories of changes, all mechanical:

### 1. Server — route mount (`server/src/infra/server.ts`)

```ts
// Before
app.use('/api', unprotectedRouter);
app.use('/api', protectedRouter);

// After
app.use('/', unprotectedRouter);
app.use('/', protectedRouter);
```

Not affected:
- `GET /` healthcheck (mounted directly on `app`)
- `/api-docs` and `/api-docs.yaml` OpenAPI endpoints (mounted directly on `app`)

### 2. Frontend — RTK Query base URL (`frontend/src/services/api.service.ts`)

```ts
// Before
baseUrl: `${config.apiEndpoint}/api`,

// After
baseUrl: config.apiEndpoint,
```

`config.apiEndpoint` is already the full subdomain URL. No env var changes needed in any environment. Local dev (`VITE_API_URL=http://localhost:3001`) works as-is.

### 3. Tests & MSW mocks — find-replace

- **~15 server controller test files** in `server/src/controllers/` and `server/src/controllers/test/`: replace `/api/` prefix in all hardcoded route strings.
- **~20 frontend MSW handler files** in `frontend/src/mocks/handlers/`: replace `${config.apiEndpoint}/api/` with `${config.apiEndpoint}/` in all handler URL patterns.

No logic changes — purely string substitution.

## Out of scope

- No backward-compatibility redirects: server and frontend deploy atomically from the same monorepo, so there is no window where routes are mismatched.
- No external consumers use the `api.*` routes with the `/api` prefix.
- No env var changes in staging or production.

## Verification

After the change:
- `yarn nx test server` — all controller tests pass
- `yarn nx test frontend` — all MSW-backed tests pass
- Manual smoke test: authenticate and load the housing list in local dev
