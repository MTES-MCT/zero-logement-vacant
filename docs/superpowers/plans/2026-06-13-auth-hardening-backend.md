# Auth Hardening — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage JWT auth stack with better-auth stateful sessions stored in HttpOnly cookies, behind a PostHog feature flag, with zero downtime.

**Architecture:** better-auth is mounted at `/api/auth/*` alongside the existing `/api/authenticate` (legacy). A new `sessionCheck` middleware replaces `jwtCheck + userCheck` on all protected routes but falls back to the legacy JWT check during the transition window. The PostHog flag `auth-v2` gates the legacy endpoint — flipping it disables legacy login and activates the new flow.

**Tech Stack:** better-auth, pg (Pool), Knex (migrations only), Vitest + supertest (tests), PostHog Node SDK (feature flag)

**Prerequisite:** Work in the `feat/auth-hardening` worktree at `~/dev/zero-logement-vacant.feat-auth-hardening/`.

---

### Task 1: Spike — audit the users table and plan the column mapping

This is investigation only — no code to commit.

**Files:**

- Read: `server/src/repositories/userRepository.ts`
- Read: `packages/models/src/UserDTO.ts`

- [ ] **Step 1: Dump the existing users table schema**

```bash
psql $DEV_DB -c "\d users"
```

- [ ] **Step 2: List every column and map it to its better-auth destination**

For each column, answer: is it a better-auth built-in field, an `additionalField`, or unused?

| users column                | better-auth destination                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `id`                        | built-in `id`                                                         |
| `email`                     | built-in `email`                                                      |
| `first_name`                | `additionalFields.firstName`                                          |
| `last_name`                 | `additionalFields.lastName`                                           |
| `role`                      | `additionalFields.role`                                               |
| `phone`                     | `additionalFields.phone`                                              |
| `position`                  | `additionalFields.position`                                           |
| `time_per_week`             | `additionalFields.timePerWeek`                                        |
| `kind`                      | `additionalFields.kind`                                               |
| `activated_at`              | `additionalFields.activatedAt` (maps to `emailVerified` conceptually) |
| `last_authenticated_at`     | `additionalFields.lastAuthenticatedAt`                                |
| `suspended_at`              | `additionalFields.suspendedAt`                                        |
| `suspended_cause`           | `additionalFields.suspendedCause`                                     |
| `deleted_at`                | `additionalFields.deletedAt`                                          |
| `establishment_id`          | **dropped** — replaced by `session.activeEstablishmentId`             |
| `password`                  | stored in `account` table by better-auth                              |
| `two_factor_*` columns      | dropped — 2FA out of scope                                            |
| `created_at` / `updated_at` | built-in                                                              |

Confirm or correct this table against the actual schema. If columns are missing, add them before Task 4.

- [ ] **Step 3: Note the existing Knex migration filename format**

```bash
ls server/src/infra/database/migrations/ | tail -5
```

Note the timestamp format (e.g. `20251215164103`). Use `20260613120000` for the new migration.

---

### Task 2: Install better-auth

**Files:**

- Modify: `server/package.json` (via yarn)
- Modify: `yarn.lock`

- [ ] **Step 1: Add better-auth to the server workspace**

```bash
yarn workspace @zerologementvacant/server add better-auth --exact
```

- [ ] **Step 2: Verify the install**

```bash
node -e "require('better-auth'); console.log('ok')" 2>/dev/null || \
  yarn workspace @zerologementvacant/server node -e "const b = require('better-auth'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add server/package.json yarn.lock
git commit -m "chore(server): add better-auth dependency"
```

---

### Task 3: Create the better-auth configuration

**Files:**

- Create: `server/src/infra/auth.ts`

- [ ] **Step 1: Create the auth configuration file**

```typescript
// server/src/infra/auth.ts
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import config from '~/infra/config';
import mailService from '~/services/mailService';
import { UserRole } from '@zerologementvacant/models';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import { refreshAuthorizedEstablishments } from '~/controllers/auth-controller';
import { fetchUserKind } from '~/services/ceremaService/userKindService';

const pool = new Pool({ connectionString: config.db.url });

export const auth = betterAuth({
  database: pool,
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days absolute max
    updateAge: 8 * 60 * 60, // extend if active within 8h window
    additionalFields: {
      activeEstablishmentId: {
        type: 'string',
        required: false,
        defaultValue: null
      }
    }
  },
  user: {
    modelName: 'auth_users',
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      role: {
        type: 'string',
        required: true,
        defaultValue: UserRole.USUAL,
        input: false
      },
      phone: { type: 'string', required: false },
      position: { type: 'string', required: false },
      timePerWeek: { type: 'string', required: false },
      kind: { type: 'string', required: false },
      activatedAt: { type: 'date', required: false },
      lastAuthenticatedAt: { type: 'date', required: false },
      suspendedAt: { type: 'date', required: false },
      suspendedCause: { type: 'string', required: false },
      deletedAt: { type: 'date', required: false }
    }
  },
  emailAndPassword: {
    enabled: true
    // Prevent account enumeration: same error for unknown email and wrong password.
    // better-auth does this by default — verify in integration tests (Task 9).
  },
  emailVerification: {
    enabled: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Verify the exact method name before implementing:
      // grep -r "sendEmail\|sendVerif\|sendActivat" server/src/services/mailService.ts
      await mailService.sendEmailValidation(
        { id: user.id, email: user.email, firstName: user.name },
        url
      );
    }
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Auto-select first authorised establishment at sign-in.
          const authorised =
            await userEstablishmentRepository.getAuthorizedEstablishments(
              session.userId
            );
          const first = authorised.find((e) => e.hasCommitment);
          return {
            data: {
              ...session,
              activeEstablishmentId: first?.establishmentId ?? null
            }
          };
        },
        after: async (session) => {
          // Refresh Portail DF rights and user kind after session creation.
          // Errors are swallowed — login must not fail due to Portail DF being down.
          try {
            const userId = session.userId;
            // Build a minimal UserApi-like object for refreshAuthorizedEstablishments.
            // Full user is fetched inside that function.
            await refreshAuthorizedEstablishments({ id: userId } as any);
            await fetchUserKind((session as any).user?.email ?? '');
          } catch {
            // non-fatal
          }
        }
      }
    }
  },
  trustedOrigins: [config.app.frontendUrl],
  advanced: {
    cookiePrefix: 'zlv'
  }
});
```

> **Note:** `refreshAuthorizedEstablishments` is currently a private function in `auth-controller.ts`. Export it in Task 6.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
yarn nx typecheck server 2>&1 | head -30
```

Expected: no errors in `src/infra/auth.ts`. Ignore unrelated pre-existing errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/infra/auth.ts
git commit -m "feat(server): add better-auth configuration"
```

---

### Task 4: Generate and apply the database migration

**Files:**

- Create: `server/src/infra/database/migrations/20260613120000_better_auth_tables.ts`

- [ ] **Step 1: Generate the better-auth SQL schema**

```bash
cd server && npx @better-auth/cli generate --output /tmp/better-auth-schema.sql
```

If the CLI is not available:

```bash
cd server && npx better-auth generate --output /tmp/better-auth-schema.sql
```

Inspect the output to confirm table names (`auth_users`, `session`, `account`, `verification`) and column names match what the config in Task 3 specifies.

- [ ] **Step 2: Create the Knex migration**

Create `server/src/infra/database/migrations/20260613120000_better_auth_tables.ts`:

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_users', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('image').nullable();
    // ZLV additionalFields
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.string('role').notNullable().defaultTo('usual');
    table.string('phone').nullable();
    table.string('position').nullable();
    table.string('time_per_week').nullable();
    table.string('kind').nullable();
    table.timestamp('activated_at').nullable();
    table.timestamp('last_authenticated_at').nullable();
    table.timestamp('suspended_at').nullable();
    table.string('suspended_cause').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('session', (table) => {
    table.string('id').primary();
    table.timestamp('expires_at').notNullable();
    table.string('token').notNullable().unique();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('auth_users')
      .onDelete('cascade');
    // ZLV additionalFields
    table.string('active_establishment_id').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('account', (table) => {
    table.string('id').primary();
    table.string('account_id').notNullable();
    table.string('provider_id').notNullable();
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('auth_users')
      .onDelete('cascade');
    table.text('access_token').nullable();
    table.text('refresh_token').nullable();
    table.text('id_token').nullable();
    table.timestamp('access_token_expires_at').nullable();
    table.timestamp('refresh_token_expires_at').nullable();
    table.text('scope').nullable();
    table.text('password').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('verification', (table) => {
    table.string('id').primary();
    table.string('identifier').notNullable();
    table.string('value').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification');
  await knex.schema.dropTableIfExists('account');
  await knex.schema.dropTableIfExists('session');
  await knex.schema.dropTableIfExists('auth_users');
}
```

> **Important:** Cross-check every column name against the SQL generated in Step 1. Column names must exactly match what better-auth expects. If there is a discrepancy, update both the migration and `auth.ts` `fields` remapping accordingly.

- [ ] **Step 3: Run the migration**

```bash
yarn workspace @zerologementvacant/server migrate
```

Expected: `Batch 1 run: 1 migrations`

- [ ] **Step 4: Verify tables exist**

```bash
psql $DEV_DB -c "\dt auth_users session account verification"
```

Expected: four tables listed.

- [ ] **Step 5: Run migration on test DB**

```bash
yarn workspace @zerologementvacant/server migrate:test
```

- [ ] **Step 6: Commit**

```bash
git add server/src/infra/database/migrations/20260613120000_better_auth_tables.ts
git commit -m "feat(server): add better-auth database tables migration"
```

---

### Task 5: Mount the better-auth Express handler and update CORS

**Files:**

- Modify: `server/src/app.ts` (or wherever Express is configured — find with `grep -r "express()" server/src`)
- Modify: `server/src/infra/config.ts` (if db URL needs exposing)

- [ ] **Step 1: Find the Express app entry point**

```bash
grep -r "express()" server/src --include="*.ts" -l
```

- [ ] **Step 2: Mount the better-auth handler**

In the Express app file, add **before** `express.json()` middleware (better-auth reads raw request bodies):

```typescript
import { toNodeHandler } from 'better-auth/node';
import { auth } from '~/infra/auth';

// Mount before express.json() — better-auth reads the raw body
app.all('/api/auth/*', toNodeHandler(auth));
```

- [ ] **Step 3: Update CORS to allow credentials**

Find the existing `cors()` call and update:

```typescript
app.use(
  cors({
    origin: config.app.frontendUrl,
    credentials: true, // required for cookie auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'] // remove x-access-token
  })
);
```

- [ ] **Step 4: Verify the server starts**

```bash
yarn nx dev server 2>&1 | head -20
```

Expected: server starts without errors. `GET /api/auth/get-session` returns `{"session":null}`.

```bash
curl -s http://localhost:3001/api/auth/get-session | jq .
```

- [ ] **Step 5: Commit**

```bash
git add server/src/app.ts  # adjust path as needed
git commit -m "feat(server): mount better-auth handler and update CORS"
```

---

### Task 6: Extract refreshAuthorizedEstablishments to a service and create sessionCheck middleware

`auth.ts` (Task 3) imports `refreshAuthorizedEstablishments`. `auth-controller.ts` will later import `auth.ts` via `sessionCheck`. This creates a circular dependency. Fix: move `refreshAuthorizedEstablishments` to a standalone service file before wiring it into `auth.ts`.

**Files:**

- Create: `server/src/services/establishmentAuthService.ts` (extracted function)
- Modify: `server/src/controllers/auth-controller.ts` (import from new service, remove local definition)
- Modify: `server/src/infra/auth.ts` (update import to new service path)
- Create: `server/src/middlewares/session.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/middlewares/test/session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import { sessionCheck } from '../session';
import { auth } from '~/infra/auth';
import * as userRepo from '~/repositories/userRepository';
import * as establishmentRepo from '~/repositories/establishmentRepository';
import AuthenticationMissingError from '~/errors/authenticationMissingError';

vi.mock('~/infra/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}));
vi.mock('~/repositories/userRepository');
vi.mock('~/repositories/establishmentRepository');
vi.mock('~/repositories/userPerimeterRepository');

const mockGetSession = vi.mocked(auth.api.getSession);

describe('sessionCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws AuthenticationMissingError when no session and required=true', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await expect(sessionCheck()(req, res, next)).rejects.toThrow(
      AuthenticationMissingError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() without error when no session and required=false', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await sessionCheck({ required: false })(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('populates req.user and req.establishment from session', async () => {
    const fakeUser = { id: 'user-1', role: 'usual', email: 'a@b.com' };
    const fakeEstablishment = { id: 'est-1', geoCodes: ['75056'] };
    mockGetSession.mockResolvedValue({
      user: fakeUser,
      session: { activeEstablishmentId: 'est-1' }
    } as any);
    vi.mocked(userRepo.default.get).mockResolvedValue(fakeUser as any);
    vi.mocked(establishmentRepo.default.get).mockResolvedValue(
      fakeEstablishment as any
    );

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await sessionCheck()(req, res, next);

    expect((req as any).user).toEqual(fakeUser);
    expect((req as any).establishment).toEqual(fakeEstablishment);
    expect(next).toHaveBeenCalledWith();
  });
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
yarn nx test server -- src/middlewares/test/session.test.ts
```

Expected: FAIL — `sessionCheck` not found.

- [ ] **Step 3: Extract refreshAuthorizedEstablishments to a service**

Create `server/src/services/establishmentAuthService.ts`:

```typescript
// Move the entire refreshAuthorizedEstablishments function body here from auth-controller.ts.
// Keep the same signature and implementation — this is a pure extraction, no logic change.
import type { UserApi } from '~/models/UserApi';
// ... same imports as in auth-controller.ts for this function

export async function refreshAuthorizedEstablishments(
  user: UserApi
): Promise<void> {
  // paste existing function body here
}
```

In `server/src/controllers/auth-controller.ts`, delete the function body and add:

```typescript
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';
```

In `server/src/infra/auth.ts`, update the import:

```typescript
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';
```

- [ ] **Step 4: Create the sessionCheck middleware**

Create `server/src/middlewares/session.ts`:

```typescript
import { UserRole } from '@zerologementvacant/models';
import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import memoize from 'memoizee';
import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import UserMissingError from '~/errors/userMissingError';
import { auth } from '~/infra/auth';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';

interface CheckOptions {
  required?: boolean; // default: true
}

const CACHE_MAX_AGE = 5 * 60 * 1000;

export function sessionCheck(options?: CheckOptions) {
  const getUser = memoize(userRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });
  const getEstablishment = memoize(establishmentRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });
  const getUserPerimeter = memoize(userPerimeterRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });

  return async (request: Request, _: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers)
    });

    if (!session) {
      if (options?.required ?? true) {
        throw new AuthenticationMissingError();
      }
      return next();
    }

    const { user: sessionUser, session: sessionData } = session;
    const establishmentId = (sessionData as any).activeEstablishmentId as
      | string
      | null;

    const [user, establishment, userPerimeter] = await Promise.all([
      getUser(sessionUser.id),
      establishmentId
        ? getEstablishment(establishmentId)
        : Promise.resolve(null),
      getUserPerimeter(sessionUser.id)
    ]);

    if (!user) {
      throw new UserMissingError(sessionUser.id);
    }
    if (!establishment) {
      throw new EstablishmentMissingError(establishmentId ?? '');
    }

    request.user = user;
    request.establishment = establishment;
    request.userPerimeter = userPerimeter;

    const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(
      user.role
    );
    request.effectiveGeoCodes = isAdminOrVisitor
      ? undefined
      : await filterGeoCodesByPerimeter(
          establishment.geoCodes,
          userPerimeter,
          establishment.siren
        );

    next();
  };
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn nx test server -- src/middlewares/test/session.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/middlewares/session.ts \
        server/src/middlewares/test/session.test.ts \
        server/src/controllers/auth-controller.ts
git commit -m "feat(server): add sessionCheck middleware backed by better-auth"
```

---

### Task 7: Wire sessionCheck into protected routes (alongside legacy jwtCheck)

**Files:**

- Modify: `server/src/routers/protected.ts`

- [ ] **Step 1: Find how protected routes are wired**

```bash
cat server/src/routers/protected.ts | head -40
```

- [ ] **Step 2: Add sessionCheck as a first-try middleware**

In `protected.ts`, update the middleware chain so `sessionCheck` runs first. If it populates `req.user`, the request proceeds. If no session cookie is found, fall back to `jwtCheck` (for users still carrying a legacy JWT during the transition window).

```typescript
import { sessionCheck } from '~/middlewares/session';
import { jwtCheck, userCheck, hasRole } from '~/middlewares/auth';

// Transition-window auth: try cookie session first, fall back to legacy JWT.
export const authMiddleware = [
  async (req: Request, res: Response, next: NextFunction) => {
    const cookieHeader = req.headers.cookie ?? '';
    if (cookieHeader.includes('zlv.session_token')) {
      // New auth path — cookie present
      return sessionCheck()(req, res, next);
    }
    // Legacy auth path — no cookie, try x-access-token header
    return jwtCheck()(req, res, (err) => {
      if (err) return next(err);
      userCheck()(req, res, next);
    });
  }
];
```

Replace the existing `[jwtCheck(), userCheck()]` chain in `protected.ts` with `authMiddleware`.

- [ ] **Step 3: Verify the server still handles legacy requests**

```bash
yarn nx dev server &
# Hit a protected route with a valid legacy JWT
curl -s -H "x-access-token: <a-valid-dev-jwt>" \
  http://localhost:3001/api/housings?page=1 | jq '.totalCount'
```

Expected: a number (not 401).

- [ ] **Step 4: Commit**

```bash
git add server/src/routers/protected.ts
git commit -m "feat(server): wire sessionCheck with jwtCheck fallback on protected routes"
```

---

### Task 8: changeEstablishment — POST, session-based

**Files:**

- Modify: `server/src/controllers/auth-controller.ts`
- Modify: `server/src/routers/unprotected.ts` or wherever the route is declared

- [ ] **Step 1: Write the failing test**

In `server/src/controllers/test/auth-api.test.ts`, add:

```typescript
describe('POST /api/account/establishments/:id', () => {
  it('returns 403 when USUAL user requests an establishment they are not authorised for', async () => {
    const user = await createTestUser({ role: UserRole.USUAL });
    const token = signTestToken(user);
    const unauthorisedEstablishmentId = 'other-establishment-id';

    const response = await request(app)
      .post(`/api/account/establishments/${unauthorisedEstablishmentId}`)
      .set('x-access-token', token);

    expect(response.status).toBe(constants.HTTP_STATUS_FORBIDDEN);
  });

  it('returns 200 and updated establishment for an authorised USUAL user', async () => {
    const establishment = await createTestEstablishment();
    const user = await createTestUser({ role: UserRole.USUAL });
    await linkUserToEstablishment(user.id, establishment.id);
    const token = signTestToken(user, establishment.id);

    const response = await request(app)
      .post(`/api/account/establishments/${establishment.id}`)
      .set('x-access-token', token);

    expect(response.status).toBe(constants.HTTP_STATUS_OK);
    expect(response.body.establishment.id).toBe(establishment.id);
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts \
  --reporter=verbose 2>&1 | grep "changeEstablishment\|POST.*establishments"
```

Expected: FAIL — route not found or wrong method.

- [ ] **Step 3: Update changeEstablishment to use session**

In `server/src/controllers/auth-controller.ts`, replace the `changeEstablishment` function body:

```typescript
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '~/infra/auth';

async function changeEstablishment(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const establishmentId = request.params.establishmentId;

  // ADMIN and VISITOR can switch to any establishment
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const authorisedEstablishments =
      await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
    const authorisedIds = authorisedEstablishments
      .filter((e) => e.hasCommitment)
      .map((e) => e.establishmentId);

    if (!authorisedIds.includes(establishmentId)) {
      logger.warn('User tried to switch to unauthorised establishment', {
        userId: user.id,
        requestedEstablishment: establishmentId,
        authorisedEstablishments: authorisedIds
      });
      throw new AuthenticationFailedError();
    }
  }

  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  // Update the session's active establishment.
  // Verify the exact updateSession API shape against better-auth docs before implementing:
  // https://www.better-auth.com/docs/concepts/session-management
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  if (session) {
    await auth.api.updateSession({
      headers: fromNodeHeaders(request.headers),
      body: { activeEstablishmentId: establishmentId } as any
    });
  }

  const userPerimeter = await userPerimeterRepository.get(user.id);
  const effectiveGeoCodes = await filterGeoCodesByPerimeter(
    establishment.geoCodes,
    userPerimeter,
    establishment.siren
  );

  response.status(constants.HTTP_STATUS_OK).json({
    establishment,
    effectiveGeoCodes
  });
}
```

- [ ] **Step 4: Change the route from GET to POST**

Find the route declaration (likely in `server/src/routers/protected.ts` or a dedicated auth router):

```bash
grep -rn "establishments/:establishmentId\|changeEstablishment" server/src/routers/
```

Change:

```typescript
router.get(
  '/account/establishments/:establishmentId',
  authController.changeEstablishment
);
```

To:

```typescript
router.post(
  '/account/establishments/:establishmentId',
  authController.changeEstablishment
);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/auth-controller.ts server/src/routers/
git commit -m "feat(server): changeEstablishment POST, session-based (no user record write)"
```

---

### Task 9: PostHog feature flag gate on legacy /api/authenticate

When `auth-v2` is enabled in PostHog, the legacy sign-in endpoint returns 410 Gone, pushing clients to the new `/api/auth/sign-in/email` path.

**Files:**

- Modify: `server/src/controllers/auth-controller.ts`
- Modify: `server/src/services/posthogService.ts` (if needed)

- [ ] **Step 1: Write the failing test**

In `server/src/controllers/test/auth-api.test.ts`, add:

```typescript
describe('POST /api/authenticate (legacy)', () => {
  it('returns 410 Gone when auth-v2 PostHog flag is enabled', async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);

    const response = await request(app)
      .post('/api/authenticate')
      .send({ email: 'user@test.fr', password: 'password' });

    expect(response.status).toBe(constants.HTTP_STATUS_GONE);
  });

  it('proceeds normally when auth-v2 flag is disabled', async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);

    const response = await request(app)
      .post('/api/authenticate')
      .send({ email: 'unknown@test.fr', password: 'wrong' });

    // Reaches auth logic (returns 401, not 410)
    expect(response.status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts \
  --reporter=verbose 2>&1 | grep "410\|Gone\|auth-v2"
```

Expected: FAIL.

- [ ] **Step 3: Add the flag check to signIn**

At the top of the `signIn` handler in `auth-controller.ts`:

```typescript
import { isFeatureEnabled } from '~/services/posthogService';

const signIn: RequestHandler<never, unknown, SignInPayload, never> = async (
  request,
  response
): Promise<void> => {
  const v2Enabled = await isFeatureEnabled('auth-v2', 'system');
  if (v2Enabled) {
    response
      .status(constants.HTTP_STATUS_GONE)
      .json({ message: 'Use /api/auth/sign-in/email' });
    return;
  }

  // ... rest of existing signIn logic unchanged
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/auth-controller.ts \
        server/src/controllers/test/auth-api.test.ts
git commit -m "feat(server): gate legacy signIn behind auth-v2 PostHog flag"
```

---

### Task 10: End-to-end integration test for the new sign-in flow

**Files:**

- Modify: `server/src/controllers/test/auth-api.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
describe('POST /api/auth/sign-in/email (better-auth)', () => {
  it('sets an HttpOnly cookie on successful sign-in', async () => {
    // Create a user in auth_users (not users) via better-auth admin API or direct DB insert
    await db('auth_users').insert({
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@zlv.fr',
      email_verified: true,
      role: 'usual',
      created_at: new Date(),
      updated_at: new Date()
    });
    await db('account').insert({
      id: 'account-1',
      account_id: 'test@zlv.fr',
      provider_id: 'credential',
      user_id: 'test-user-1',
      password: await bcrypt.hash('not-a-real-password', 10),
      created_at: new Date(),
      updated_at: new Date()
    });

    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: 'test@zlv.fr', password: 'not-a-real-password' });

    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c) => c.includes('zlv.session_token'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Strict');
  });

  it('returns identical error for unknown email and wrong password (no enumeration)', async () => {
    const [unknownEmailResponse, wrongPasswordResponse] = await Promise.all([
      request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: 'nobody@zlv.fr', password: 'not-a-real-password' }),
      request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: 'test@zlv.fr', password: 'WrongPassword1!' })
    ]);

    expect(unknownEmailResponse.status).toBe(401);
    expect(wrongPasswordResponse.status).toBe(401);
    // Response bodies must be identical to prevent enumeration
    expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body);
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts \
  --reporter=verbose 2>&1 | grep "better-auth\|sign-in/email"
```

Expected: FAIL (tables exist from migration but test setup may need adjustment).

- [ ] **Step 3: Fix test setup until tests pass**

The test DB needs the better-auth tables. Confirm the test migration ran (Task 4, Step 5). Adjust the test fixture inserts as needed based on actual column names from `\d auth_users`.

```bash
psql $TEST_DB -c "\d auth_users"
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn nx test server -- src/controllers/test/auth-api.test.ts
```

Expected: PASS (all tests including previous tasks).

- [ ] **Step 5: Run the full server test suite**

```bash
yarn nx test server
```

Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/test/auth-api.test.ts
git commit -m "test(server): integration tests for better-auth sign-in flow"
```

---

## What's next

This plan covers the backend only. The frontend plan (`2026-06-13-auth-hardening-frontend.md`) covers:

- `AuthProvider` + `AuthContext` + `useAuth` hook
- Replacing the Redux auth slice and `auth.service.ts`
- RTK Query `credentials: 'include'`
- Updating `LoginView` to call better-auth client
- Feature flag gate on the frontend auth path

The backend must be deployed (flag off) before the frontend plan begins.
