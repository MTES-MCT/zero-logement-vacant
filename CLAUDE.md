# Zéro Logement Vacant - Monorepo Development Guide

## Project Overview

Yarn v4 monorepo with Nx for build orchestration and task running. French government application to track and reduce vacant housing.

**Stack:** TypeScript, React (frontend), Express (backend), PostgreSQL

## Monorepo Structure

```
├── frontend/          # React app (@zerologementvacant/front)
├── server/            # Express API (@zerologementvacant/server)
├── e2e/               # End-to-end Cypress tests
├── queue/             # Background job processor
└── packages/
    ├── api-sdk/       # API client
    ├── models/        # Shared data models (DTOs)
    ├── schemas/       # Validation schemas
    ├── utils/         # Shared utilities
    ├── healthcheck/   # Health check utilities
    └── draft/         # Draft models/utilities
```

## Essential Commands

**Run commands from root using Nx:**

```bash
nx <target> <project>              # Run specific task for project
nx run-many -t <target>            # Run task for all projects
nx run-many -t <target> --exclude=zero-logement-vacant
```

**Available targets:** `build`, `test`, `typecheck`, `lint`, `dev`

**Examples:**

```bash
nx test server                     # Test server only
nx test server -- <file-pattern>   # Test specific files (vitest)
nx build frontend                  # Build frontend
yarn test                          # Test all (via nx run-many)
```

## Development Workflow

### 1. Environment Setup

Copy `.env.example` files in each workspace and configure.

### 2. Database

```bash
export DEV_DB=postgres://postgres:postgres@localhost/dev
export TEST_DB=postgres://postgres:postgres@localhost/test
bash .docker/setup.sh              # Setup DB + services
```

Or manually:

```bash
docker compose -f .docker/docker-compose.yml up -d
yarn workspace @zerologementvacant/server migrate
yarn workspace @zerologementvacant/server seed
```

### 3. Local Development

```bash
yarn workspace @zerologementvacant/front dev    # localhost:3000
yarn workspace @zerologementvacant/server dev   # localhost:3001/api
```

## Code Standards

### Frontend Import Aliases

Use `~/` path alias for imports within frontend workspace:
```typescript
import { useGetGeoStatisticsQuery } from '~/services/geo.service';
```

### Shared Code Location

- **Models/DTOs** → `packages/models/` (naming: `ExampleDTO`, `ExamplePayload`)
- **Validation schemas** → `packages/schemas/`
- **Utilities** → `packages/utils/`
- **Types** → Co-locate with implementation or shared packages

### Testing Requirements

- **API input validation tests** → Use `@fast-check/vitest` (property-based testing)
- **Schema validation tests** → Use `@fast-check/vitest`
- **Repository tests** → `src/repositories/test/<name>Repository.test.ts`
- **API endpoint tests** → `src/controllers/test/<name>-api.test.ts`

### Workspace-Specific Guides

- **Server API development** → [server/CLAUDE.md](server/CLAUDE.md)
- (Add frontend/CLAUDE.md if needed)

## Dependencies

**Package manager:** Yarn v4 (required Node v24)

**Security:** Use `npq` for dependency auditing:

```bash
npx npq install <package-name>     # Checks vulnerabilities before install
```

## Testing Strategy

- Server uses **Vitest**
- Frontend uses **Vitest** + React Testing Library
- E2E uses **Cypress**
- Use `nx test <project> -- <pattern>` to filter test files

## CI/CD

GitHub Actions runs E2E tests on PRs. See badge in README.

**Environments:**

- Staging: <https://zerologementvacant-staging.incubateur.net>
- Production: <https://zerologementvacant.beta.gouv.fr>

## Common Pitfalls

1. **Wrong test runner args** → Server uses Vitest, not Jest
2. **Missing env vars** → Each workspace needs its own .env
3. **DB not migrated** → Run migrations after pulling
4. **Using `yarn test` in workspace** → Use `nx test <project>` from root instead

## Git Hooks

Husky configured for pre-commit linting. Configured via `.husky/`.
