# Server (Backend) Development Guide

> **Note:** `CLAUDE.md` is a symlink to this file for backward compatibility with Claude Code.

## Quick Reference

**Adding an API endpoint?** Follow the [API Development Workflow](#api-development-workflow)

**Validation?** Use Yup schemas + `validatorNext.validate()` in routers ([Validation](#validation-patterns))

**Database queries?** Use repositories, not direct queries ([Repository Patterns](#repository-patterns))

**Tests?** Write tests BEFORE implementation, use property-based testing for API tests ([Testing](#testing))

## Project Structure

```
server/src/
├── controllers/         # Request handlers (list, get, create, update, remove)
│   └── test/           # API integration tests (*-api.test.ts)
├── repositories/        # Database access layer
│   └── test/           # Repository tests (*Repository.test.ts)
├── routers/            # Route definitions and validation
│   ├── protected.ts    # Authenticated routes (jwtCheck + userCheck)
│   └── unprotected.ts  # Public routes
├── middlewares/        # Express middleware (auth, error handling, etc.)
├── models/             # TypeScript interfaces (*Api.ts)
├── services/           # External services (mail, BAN API, etc.)
├── infra/              # Infrastructure (server, config, database)
├── errors/             # Custom error classes (*Error.ts)
└── test/               # Test utilities and fixtures
```

## API Development Workflow

**CRITICAL: Tests MUST be written BEFORE implementation (TDD is mandatory)**

### Step 1: Router

Add or update the route in [routers/protected.ts](src/routers/protected.ts) or [routers/unprotected.ts](src/routers/unprotected.ts)

```typescript
// Protected route example
housingRouter.put(
  '/:id',
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingUpdatePayload
  }),
  housingController.update
);

// Unprotected route example
authRouter.post(
  '/signin',
  validatorNext.validate({
    body: object({
      email: string().required().email(),
      password: string().required()
    })
  }),
  authController.signIn
);
```

**Router conventions:**

- Use `validatorNext.validate()` for input validation (preferred)
- Protected routes require `jwtCheck()` and `userCheck()` middleware
- Use `hasRole()` for role-based authorization
- Legacy: Some routes still use express-validator (don't mix approaches)

### Step 2: Controller (Write Tests First!)

**Test the API** using a file `*-api.test.ts` in [controllers/test/](src/controllers/test/)

```typescript
// controllers/test/housing-api.test.ts
import request from 'supertest';

import { createServer } from '~/infra/server';
import { genHousingApi } from '~/test/testFixtures';

describe('Housing API', () => {
  const { app } = createServer();

  beforeAll(async () => {
    // Setup fixtures
  });

  it('should update housing', async () => {
    const housing = genHousingApi();
    const payload = { status: 2 };

    await request(app)
      .put(`/api/housing/${housing.id}`)
      .set('x-access-token', tokenProvider.generate(user.id, establishment.id))
      .send(payload)
      .expect(200);
  });
});
```

**Write the controller code** in a controller function:

```typescript
// controllers/housingController.ts
import { RequestHandler } from 'express';

import { AuthenticatedRequest } from '~/middlewares/auth';

const update: RequestHandler<...> = async (request, response) => {
  const { params, body, establishment } = request as AuthenticatedRequest<...>;

  const housing = await housingRepository.findOne({
    id: params.id,
    establishmentId: establishment.id
  });

  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  await housingRepository.update({ ...housing, ...body });

  response.status(constants.HTTP_STATUS_OK).json(housing);
};
```

**Controller conventions:**

- Method naming for CRUD: `list`, `get`, `create`, `update`, `remove`
- Type signature: `RequestHandler<Params, Response, Body, Query>`
- Extract from `AuthenticatedRequest` for protected routes
- Throw custom `HttpError` subclasses for error handling
- No try-catch needed (express-promise-router handles async errors)

### Step 3: Repository (Write Tests First!)

**Test the repository** using a file `*Repository.test.ts` in [repositories/test/](src/repositories/test/)

```typescript
// repositories/test/housingRepository.test.ts
import { housingRepository, HousingDBO } from '~/repositories/housingRepository';
import { genHousingApi } from '~/test/testFixtures';

describe('Housing repository', () => {
  it('should find housing by id', async () => {
    const housing = genHousingApi();
    await Housings().insert(toHousingDBO(housing));

    const actual = await housingRepository.findOne({ id: housing.id });

    expect(actual).toMatchObject<Partial<HousingDBO>>(housing);
  });
});
```

**Use or create the related repository:**

```typescript
// repositories/housingRepository.ts
import db from '~/infra/database';

const housingTable = 'fast_housing';

export const housingRepository = {
  async findOne(filter: HousingFilter): Promise<HousingApi | null> {
    const query = db(housingTable)
      .where(db.where(filter))
      .whereNull('deleted_at')
      .first();

    return query ?? null;
  },

  async update(housing: HousingApi): Promise<void> {
    await db(housingTable)
      .where({ id: housing.id })
      .update(formatHousingApi(housing));
  }
};
```

**Repository conventions:**

- Standard methods: `find()`, `findOne()`, `count()`, `create()`, `update()`, `remove()`, `insert()`
- Use Knex query builder
- Apply `notDeleted()` filter for soft deletes
- Use database utilities: `where()`, `likeUnaccent()`, `onConflict()`

### Step 4: Validation

**API input validation happens in routers** using `validatorNext.validate()`

**Schemas should be shared** in `@zerologementvacant/schemas` package:

```typescript
// packages/schemas/src/housing-update-payload.ts
import { object, string, number } from 'yup';

export const housingUpdatePayload = object({
  status: number().required(),
  occupancy: string().oneOf(['VACANT', 'OCCUPIED', 'UNKNOWN']),
  precarity: boolean().optional()
});
```

**Test schemas** using `@fast-check/vitest` for property-based testing:

```typescript
// packages/schemas/src/test/housing-update-payload.test.ts
import { fc, test } from '@fast-check/vitest';
import { housingUpdatePayload } from '../housing-update-payload';

test.prop([
  fc.record({
    status: fc.integer({ min: 0, max: 10 }),
    occupancy: fc.constantFrom('VACANT', 'OCCUPIED', 'UNKNOWN')
  })
])('should validate valid payload', async (payload) => {
  await expect(housingUpdatePayload.validate(payload)).resolves.toBeDefined();
});
```

**Validation conventions:**

- Validation happens in routers, NOT controllers
- Use `validatorNext.validate()` (preferred) or express-validator (legacy)
- Don't mix validation approaches
- Errors wrapped in `ValidationError` extending `HttpError`

### Step 5: Models

**API models extend DTOs** from `@zerologementvacant/models`:

```typescript
// models/HousingApi.ts
import { HousingDTO } from '@zerologementvacant/models';

export interface HousingApi extends HousingDTO {
  // Backend-specific fields (if any)
}
```

**Shared DTOs** go to `packages/models/`:

```typescript
// packages/models/src/HousingDTO.ts
export interface HousingDTO {
  id: string;
  rawAddress: string[];
  status: HousingStatus;
  occupancy: Occupancy;
  // ...
}

// Payload naming (no DTO suffix)
export interface HousingUpdatePayload {
  status?: HousingStatus;
  occupancy?: Occupancy;
}
```

**Model naming conventions:**

- DTOs (shared): `HousingDTO` from `@zerologementvacant/models`
- Backend APIs: `HousingApi` (extends DTO)
- Database records: `HousingDBO` (database representation)
- Payloads: `HousingUpdatePayload`, `HousingCreationPayload` (no DTO suffix)

## Validation Patterns

### Two Systems (Don't Mix!)

**Preferred: Yup + validatorNext (Modern)**

```typescript
// In router
import { schemas } from '@zerologementvacant/schemas';

import { validatorNext } from '~/middlewares/validatorNext';

router.put(
  '/:id',
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingUpdatePayload
  }),
  controller.update
);
```

**Legacy: express-validator**

```typescript
// In router (legacy pattern - avoid for new code)
import { param, body } from 'express-validator';

import { validator } from '~/middlewares/validator';

router.put(
  '/:id',
  [
    param('id').isUUID().notEmpty(),
    body('status').isInt(),
    body('occupancy').isString().isIn(['VACANT', 'OCCUPIED'])
  ],
  validator.validate,
  controller.update
);
```

**Key principle:** Validation happens in routers BEFORE controllers

## Repository Patterns

### Standard Methods

```typescript
export interface ExampleDBO {}

// List with filters, pagination, sorting
async find(options: FindOptions): Promise<ReadonlyArray<Example>> { },

// Get single entity
async findOne(options: FindOneOptions): Promise<Example | null> { },

// Count matching records
async count(options: CountOptions): Promise<number> { },

// Create single entity
async create(example: Example): Promise<void> { },

// Update entity
async update(example: Example): Promise<void> { },

// Soft delete
async remove(id: Example['id']): Promise<void> { },

// Bulk insert
async insert(examples: ReadonlyArray<Example>): Promise<void> { }

export function toExampleDBO(example: Example): ExampleDBO {}

export function fromExampleDBO(example: ExampleDBO): Example {}

const exampleRepository = {
  find,
  findOne,
  count,
  create,
  update,
  remove,
  insert
};

export default exampleRepository;
```

### Transaction Handling

**Controllers start transactions:**

```typescript
import { constants } from 'node:http2';

import { startTransaction } from '~/infra/database/transaction';

const complexOperation: RequestHandler = (request, response) => {
  await startTransaction(async () => {
    // All repository calls within this block use the same transaction
    await housingRepository.update(housing);
    await eventRepository.create(event);
    // Auto-commits on success, rolls back on error
  });

  response.status(constants.HTTP_STATUS_OK).json(/* ... */);
};
```

**Repositories use active transaction:**

```typescript
import { withinTransaction } from '../infra/database/transaction';

async function update(housing: Housing): Promise<void> {
  // Gets the active transaction, if any
  await withinTransaction(async (transaction) => {
    await Housing(transaction).where({ id: housing.id }).update(housing);
  });
}
```

**Transaction conventions:**

- Controllers start transactions with `startTransaction()`
- Repositories use `withinTransaction()` to check for active transaction
- Don't start transactions in repositories
- Uses AsyncLocalStorage for tracking across async boundaries

### Database Utilities

**From `infra/database/db` module:**

```typescript
import db from '../infra/database';

// Build WHERE clauses from properties
db.where<Housing>({ status: 2, occupancy: 'VACANT' });

// Unaccented fuzzy search
db.likeUnaccent('name', 'Dupont');

// Handle unique constraint conflicts
db.onConflict(['id']).merge();

// Soft delete filter
db.notDeleted();

// Array to SQL placeholders
db.toRawArray(['id1', 'id2', 'id3']);
```

## Authentication & Authorization

### Middleware Chain

**Protected routes:**

```typescript
import { jwtCheck, userCheck, hasRole } from '~/middlewares/auth';
import { UserRole } from '~/models/UserApi';

// Basic authentication
router.get('/housing', jwtCheck(), userCheck(), controller.list);

// With role-based authorization
router.delete(
  '/housing/:id',
  jwtCheck(),
  userCheck(),
  hasRole([UserRole.ADMIN]),
  controller.remove
);
```

### Middleware Details

**`jwtCheck(options?: { required?: boolean })`**

- Validates JWT token from `x-access-token` header or query
- Uses HS256 algorithm
- Optional enforcement with `required: false`

**`userCheck(options?: { required?: boolean })`**

- Loads User and Establishment from DB using JWT payload
- Throws `AuthenticationMissingError`, `UserMissingError`, `EstablishmentMissingError`
- Attaches to `request.user` and `request.establishment`
- Memoized for performance

**`hasRole(roles: UserRole[])`**

- Checks if authenticated user's role is in allowed list
- Throws `ForbiddenError` if not authorized
- Roles: `ADMIN`, `USUAL`, `VISITOR`

### Token Payload

```typescript
interface TokenPayload {
  userId: string;
  establishmentId: string;
}
```

## Error Handling

### Custom Error Classes

**Base class** ([errors/httpError.ts](src/errors/httpError.ts)):

```typescript
export abstract class HttpError extends Error {
  status: number;
  data?: Record<string, unknown>;

  constructor(config: {
    name: string;
    message: string;
    status: number;
    data?: Record<string, unknown>;
  }) {
    super(config.message);
    this.name = config.name;
    this.status = config.status;
    this.data = config.data;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      ...this.data
    };
  }
}
```

**Example custom error:**

```typescript
// errors/HousingMissingError.ts
import HttpError from './httpError';
import { constants } from 'http2';

export default class HousingMissingError extends HttpError {
  constructor(housingId: string) {
    super({
      name: 'HousingMissingError',
      message: `Housing ${housingId} does not exist`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: { housingId }
    });
  }
}
```

### Error Throwing Pattern

**Throw custom errors from controllers:**

```typescript
async function get(request: Request, response: Response) {
  const housing = await housingRepository.findOne({ id: request.params.id });

  if (!housing) {
    throw new HousingMissingError(request.params.id);
  }

  response.status(200).json(housing);
}
```

**No try-catch needed:**

- express-promise-router catches async errors automatically
- Global error handler serializes via `error.toJSON()`
- Falls back to 500 for unknown errors

## Testing

### Test-Driven Development (TDD)

**Tests MUST be written BEFORE implementation:**

1. Write failing test first
2. Implement to make it pass
3. Refactor if needed

### Framework

- **Vitest** (not Jest!)
- Configuration: `vitest.config.ts`
- Timeout: 30 seconds
- Environment: Node.js

### Property-Based Testing (CRITICAL)

**Must use `@fast-check/vitest` for:**

- API input validation tests
- Schema validation tests
- Any test validating data structures

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([
  fc.record({
    status: fc.integer({ min: 0, max: 10 }),
    occupancy: fc.constantFrom(OCCUPANCY_VALUES)
  })
])('should validate housing update payload', async (payload) => {
  const validate = () => housingUpdatePayload.validate(payload);

  expect(validate).not.toThrow();
});
```

### Test File Locations

- **API integration tests:** `src/controllers/test/*-api.test.ts`
- **Repository tests:** `src/repositories/test/*Repository.test.ts`
- **Test fixtures:** `src/test/testFixtures.ts`

### Integration API Tests

**Test conventions:**

- **Use `jest-extended` matchers** to reduce boilerplate (installed via Vitest)
- **Use `constants` from `node:http2`** instead of raw numbers for HTTP status codes
- **Assert using primitive table accessors** (e.g., `Events()`, `HousingEvents()`) in repository and API tests, NOT the repository being tested

```typescript
import { constants } from 'node:http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import {
  genHousingApi,
  genEstablishmentApi,
  tokenProvider
} from '~/test/testFixtures';

describe('Housing API', () => {
  const { app } = createServer().testing(); // Random port for e2e tests

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    // Setup fixtures
    establishment = genEstablishmentApi();
    await establishmentRepository.insert([establishment]);

    user = genUserApi({ establishmentId: establishment.id });
    await userRepository.insert([user]);
  });

  it('should get housing by id', async () => {
    const housing = genHousingApi({ establishmentId: establishment.id });
    await housingRepository.insert([housing]);

    const { body, status } = await request(app)
      .get(`/api/housing/${housing.id}`)
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(body).toMatchObject({
      id: housing.id,
      status: housing.status
    });
  });
});
```

**Repository test example:**

```typescript
import { Events, DocumentEvents } from '~/repositories/eventRepository';

describe('eventRepository', () => {
  it('should insert document events', async () => {
    const document = genDocumentApi();
    const events: DocumentEventApi[] = [{
      id: uuidv4(),
      type: 'document:created',
      name: 'Création d'un document',
      nextOld: null,
      nextNew: { filename: document.filename },
      createdAt: new Date().toJSON(),
      createdBy: user.id,
      documentId: document.id
    }];

    await eventRepository.insertManyDocumentEvents(events);

    // ✅ CORRECT - Assert using primitive table accessor
    const [eventRecord] = await Events().where({ id: events[0].id });
    expect(eventRecord).toMatchObject({
      type: 'document:created',
      next_new: { filename: document.filename }
    });

    const [documentEvent] = await DocumentEvents()
      .where({ event_id: events[0].id });
    expect(documentEvent).toMatchObject({
      document_id: document.id
    });

    // ❌ WRONG - Don't use the repository being tested for assertions
    // const found = await eventRepository.find({ filters: { documents: [document.id] } });
  });
});
```

### Test Fixture Pattern (CRITICAL)

**All backend test fixtures must extend shared DTOs:**

```typescript
// ❌ WRONG - Legacy pattern
export function genHousingApi(): HousingApi {
  return {
    id: faker.string.uuid()
    // ... duplicate all fields
  };
}

// ✅ CORRECT - Extend shared DTO
import { genHousingDTO } from '@zerologementvacant/models';

export function genHousingApi(overrides?: Partial<HousingApi>): HousingApi {
  return {
    ...genHousingDTO(), // Extend shared DTO
    // Add backend-specific fields
    ...overrides
  };
}
```

### Running Tests

```bash
yarn nx test server                      # Test all server
yarn nx test server -- housing           # Filter by pattern
yarn nx test server -- controllers/test  # Test specific directory
```

## Express App Structure

### Middleware Stack (in order)

From [infra/server.ts](src/infra/server.ts):

1. Helmet - Security headers with CSP
2. CORS - Credentials disabled
3. JSON parser (10MB limit)
4. Rate limiting (5-minute window)
5. Health check endpoint (`GET /`)
6. Unprotected router (`/api`)
7. Protected router (`/api`)
8. 404 handler (throws RouteNotFoundError)
9. Sentry error handler
10. Global error handler

### Configuration

- Uses `convict` in [infra/config.ts](src/infra/config.ts)
- Read from `.env` file

## Database

### Connection

- **PostgreSQL** via Knex.js query builder
- Tables in snake_case: `fast_housing`, `housing_owners`
- Columns in snake_case

### Migrations & Seeding

```bash
yarn workspace @zerologementvacant/server migrate    # Run migrations
yarn workspace @zerologementvacant/server seed       # Seed database
```

### Soft Deletes

- Tables have `deleted_at` column
- Use `notDeleted()` filter in queries
- Repositories handle soft delete logic

## Common Pitfalls

1. **Wrong test runner** → Use Vitest, not Jest
2. **Validation in controllers** → Validate in routers instead
3. **Mixing validation systems** → Use validatorNext (Yup), avoid express-validator for new code
4. **No TDD** → Write tests BEFORE implementation
5. **Starting transactions in repositories** → Start in controllers, use `withinTransaction()` in repos
6. **Legacy test fixtures** → Ensure fixtures extend `gen*DTO()` from `@zerologementvacant/models`
7. **Wrong payload naming** → Use `HousingUpdatePayload`, not `HousingUpdatePayloadDTO`
8. **Try-catch in controllers** → Not needed, express-promise-router handles async errors
9. **Direct database queries** → Use repositories, not direct Knex queries in controllers
10. **Missing property-based tests** → Use `@fast-check/vitest` for validation tests

## Key Dependencies

| Category           | Library                    | Usage                               |
| ------------------ | -------------------------- | ----------------------------------- |
| **Framework**      | express                    | HTTP server                         |
| **Database**       | knex, pg                   | Query builder, PostgreSQL driver    |
| **Validation**     | yup                        | Schema validation                   |
| **Auth**           | jsonwebtoken               | JWT tokens                          |
| **Testing**        | vitest, @fast-check/vitest | Test runner, property-based testing |
| **Mocking**        | supertest                  | HTTP assertions                     |
| **Error tracking** | @sentry/node               | Error monitoring                    |
| **Utils**          | lodash                     | Utility functions                   |