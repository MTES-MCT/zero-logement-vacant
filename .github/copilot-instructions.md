# Zéro Logement Vacant - AI Coding Instructions

## Project Overview

This is a French government digital service helping municipalities manage vacant housing. It's a monorepo with Node.js/Express backend, React frontend using the French Design System (DSFR), and data analytics components.

## Architecture & Structure

### Monorepo Organization

- **server/**: Express.js API with PostgreSQL, repository pattern, and domain services
- **frontend/**: React SPA with Redux Toolkit, DSFR components, and Material-UI
- **queue/**: BullMQ for background job processing
- **packages/**: Shared libraries (models, utils, schemas, api-sdk)
- **analytics/**: DBT + DuckDB + Dagster data pipeline with Metabase dashboards
- **e2e/**: Cypress end-to-end tests

### Key Technologies

- **Effect**: Functional programming library used throughout for data transformation and validation
- **DSFR (Système de Design de l'État)**: French government design system - prefer DSFR components over custom UI
- **Lerna + Yarn workspaces**: Monorepo management with workspace dependencies
- **Knex.js**: Database migrations and query building (server/src/infra/database/)

## Development Patterns

### Functional Programming with Effect

Use `effect` library patterns extensively:

```typescript
import { pipe, Record, Struct } from 'effect';
// Example from HousingDTO.ts - prefer functional transformations
const changed = pipe(
  strategies,
  Record.map((equivalence, key) => equivalence(before[key], after[key])),
  Record.filter((equals) => !equals),
  Record.keys
);
```

### API Layer Architecture

- **Controllers**: Handle HTTP requests (server/src/controllers/)
- **Repositories**: Data access layer with typed database objects (server/src/repositories/)
- **Services**: External integrations (server/src/services/)
- **Models**: Domain objects with transformation functions (server/src/models/)

### Frontend Component Patterns

- Use DSFR components: `@codegouvfr/react-dsfr/Alert`, `Button`, `Modal`, etc.
- Custom components in `frontend/src/components/`
- Form handling with `react-hook-form` + `yup` validation
- State management with Redux Toolkit Query (RTK Query) for API calls

### Database Patterns

- Repository pattern with typed DTOs and APIs: `OwnerDBO` → `OwnerApi` → `OwnerDTO`
- Knex migrations in `server/src/infra/database/migrations/`
- Use `startTransaction()` for multi-step operations

## Critical Workflows

### Development Setup

```bash
# Database setup with Docker
export DEV_DB=postgres://postgres:postgres@localhost/dev
bash .docker/setup.sh

# Start all services
yarn workspace @zerologementvacant/server dev
yarn workspace @zerologementvacant/front dev
```

### Database Operations

```bash
# Migrations and seeding
yarn workspace @zerologementvacant/server migrate
yarn workspace @zerologementvacant/server seed
```

### Testing Strategy

- Unit tests per workspace: `yarn workspace <workspace> test`
- E2E tests: Cypress in `e2e/` directory
- Database tests use separate config: `database.jest.config.ts`

## Project-Specific Conventions

### Naming & Structure

- DTO suffix for data transfer objects shared between frontend/backend
- Api suffix for server-side domain objects
- Workspace names prefixed with `@zerologementvacant/`
- Use `effect` for functional transformations using `pipe` if possible

### DSFR Integration

- Always prefer DSFR components over custom implementations
- Use `createModal()` from `@codegouvfr/react-dsfr/Modal` for modals
- Typography: Prefer MUI Typography with DSFR theme integration
- Icons: Use DSFR icon system via `frontend/public/dsfr/utility/icons/`

### Data Validation

- Use `yup` schemas for form validation
- Effect library for data transformations and business logic
- TypeScript strict mode enabled - leverage type safety

### Error Handling

- Custom error classes in `server/src/errors/`
- Standardized API error responses
- Frontend error handling via RTK Query and notification system

## External Integrations

- **Brevo**: Email service integration
- **Elasticsearch**: Search functionality
- **CleverCloud S3**: File storage
- **BAN API**: Address validation (French national address database)
- **Sentry**: Error tracking and monitoring

## Key Files to Reference

- `packages/models/src/HousingDTO.ts`: Core domain model with Effect patterns
- `server/src/controllers/housingController.ts`: API endpoint patterns
- `frontend/src/services/housing.service.ts`: RTK Query service patterns
- `server/src/repositories/housingRepository.ts`: Database access patterns
- `frontend/src/components/`: Reusable components

## Testing Considerations

- Mock factories in tests (see `server/src/test/testFixtures.ts`)
- Use data builders for test fixtures
- Separate test databases for integration tests
- E2E tests focus on critical user journeys (campaigns, housing management)
