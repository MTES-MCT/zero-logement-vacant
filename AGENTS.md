# Zéro Logement Vacant - Monorepo Development Guide

> **Note:** `CLAUDE.md` is a symlink to this file for backward compatibility with Claude Code.

## Project Overview

Yarn v4 monorepo with Nx for build orchestration and task running. French government application to track and reduce vacant housing.

**Stack:** TypeScript, React (frontend), Express (backend), PostgreSQL

## Monorepo Structure

```
├── frontend/          # React app (@zerologementvacant/front)
│                      # See frontend/AGENTS.md for frontend-specific patterns
├── server/            # Express API (@zerologementvacant/server)
│                      # See server/AGENTS.md for backend-specific patterns
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

## Navigation Guide for AI Agents

**When to work in each workspace:**

- **Frontend work** (React components, UI, state management) → Work in `frontend/`, read [frontend/AGENTS.md](frontend/AGENTS.md)
- **Backend work** (API endpoints, database, validation) → Work in `server/`, read [server/AGENTS.md](server/AGENTS.md)
- **Shared types/models** → Work in `packages/models/` (DTOs used by both frontend and server)
- **Validation schemas** → Work in `packages/schemas/` (shared Yup schemas)
- **E2E tests** → Work in `e2e/`

**AI agents automatically read the nearest AGENTS.md file in the directory tree.** Work in the appropriate workspace and follow its specific conventions.

## Essential Commands

**Run commands from root using Nx via Yarn:**

```bash
yarn nx <target> <project>              # Run specific task for project
yarn nx run-many -t <target>            # Run task for all projects
yarn nx run-many -t <target> --exclude=zero-logement-vacant
```

**Available targets:** `build`, `test`, `typecheck`, `lint`, `dev`

**Examples:**

```bash
yarn nx test server                     # Test server only
yarn nx test server -- <file-pattern>   # Test specific files (vitest)
yarn nx build frontend                  # Build frontend
yarn test                               # Test all (via nx run-many)
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

## Cross-Workspace Patterns

### Shared Code Location

**When to create shared code:**

- **Models/DTOs** → `packages/models/` when types are used by both frontend and server
  - Naming: `ExampleDTO`, `ExamplePayload` (no DTO suffix for payloads)
  - Example: `HousingDTO`, `HousingUpdatePayload`
- **Validation schemas** → `packages/schemas/` when validation is shared
  - Used by both server (API validation) and frontend (form validation)
- **Utilities** → `packages/utils/` for pure functions used across workspaces
- **Types** → Co-locate with implementation unless shared across workspaces

**Don't duplicate types!** Always check `packages/models/` first before creating new types.

### Package Import Conventions

```typescript
// Correct - importing shared DTOs
import { HousingDTO, OwnerDTO } from '@zerologementvacant/models';
import { housingUpdatePayload } from '@zerologementvacant/schemas';

// Frontend extends DTOs with parsed values
interface Housing extends HousingDTO {
  lastContact?: Date;  // Parsed from ISO string
}

// Backend uses DTOs directly or creates API models
interface HousingApi extends HousingDTO {
  // Additional backend-specific fields
}
```

### Test Fixture Pattern (CRITICAL)

**All test fixtures must extend shared DTOs:**

- **Backend:** `genHousingApi()` must call/extend `genHousingDTO()` from `@zerologementvacant/models`
- **Frontend:** `genHousing()` must call/extend `genHousingDTO()` from `@zerologementvacant/models`
- **Anything not following this pattern is legacy and should be refactored**

Example:
```typescript
// In @zerologementvacant/models
export function genHousingDTO(): HousingDTO { ... }

// In server tests
export function genHousingApi(): HousingApi {
  return {
    ...genHousingDTO(),  // Extend shared DTO
    // Add backend-specific fields
  };
}

// In frontend tests
export function genHousing(): Housing {
  return {
    ...genHousingDTO(),  // Extend shared DTO
    // Add parsed/frontend-specific fields
  };
}
```

## Testing Strategy

**Test-Driven Development (TDD) is mandatory:**
- **Tests MUST be written BEFORE implementation**
- Write failing tests first, then implement to make them pass

**Framework:**
- **All apps and packages use Vitest** (not Jest!)
- Any workspace still using Jest is legacy or forced to do so for compatibility reasons
- E2E tests use **Cypress**

**Property-based testing:**
- **Must use `@fast-check/vitest`** for:
  - API input validation tests
  - Schema validation tests
  - Any test validating data structures

**Test file locations:**
- API endpoint tests: `src/controllers/test/<name>-api.test.ts`
- Repository tests: `src/repositories/test/<name>Repository.test.ts`
- Component tests: Co-located with components

**Running tests:**
```bash
yarn nx test <project>                  # Test specific workspace
yarn nx test <project> -- <pattern>     # Filter by file pattern
yarn test                               # Test all workspaces
```

## Dependencies

**Package manager:** Yarn v4 (requires Node v24)

**Adding dependencies:**
```bash
yarn workspace @zerologementvacant/<workspace> add <package>
```

**Security:** Use `npq` for dependency auditing:
```bash
npx npq install <package-name>     # Checks vulnerabilities before install
```

## CI/CD

GitHub Actions runs E2E tests on PRs. See badge in README.

**Environments:**
- Staging: <https://zerologementvacant-staging.incubateur.net>
- Production: <https://zerologementvacant.beta.gouv.fr>

## Common Pitfalls

1. **Wrong command** → Always use `yarn nx`, never run `nx` directly
2. **Wrong test runner** → All workspaces use Vitest (not Jest) unless forced by compatibility
3. **Duplicating types** → Always check `packages/models/` before creating new types
4. **Missing env vars** → Each workspace needs its own `.env` file
5. **DB not migrated** → Run migrations after pulling: `yarn workspace @zerologementvacant/server migrate`
6. **Using `yarn test` in workspace** → Use `yarn nx test <project>` from root instead
7. **Not following TDD** → Write tests BEFORE implementation
8. **Legacy test fixtures** → Ensure all fixtures extend `gen*DTO()` from `@zerologementvacant/models`

## Git Hooks

Husky configured for pre-commit linting. Configured via `.husky/`.

## Workspace-Specific Documentation

- **Frontend development** → [frontend/AGENTS.md](frontend/AGENTS.md)
- **Backend/API development** → [server/AGENTS.md](server/AGENTS.md)
