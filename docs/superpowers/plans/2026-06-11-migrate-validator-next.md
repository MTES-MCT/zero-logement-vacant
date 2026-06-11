# Migrate `express-validator` → `validatorNext` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `express-validator` from the server. Every request validation runs through `validatorNext` + Yup. Single PR on `refactor/migrate-validator-next`. ≈36 commits.

**Architecture:** Per-controller commit triple `relocate test → fill HTTP-layer tests against legacy → migrate router/controller to validatorNext`. Cross-cutting Yup schemas land in `packages/schemas/`. Runtime helpers stay in `server/src/models/`. `validator-next.ts` gets one targeted change: `{ stripUnknown: true }`.

**Tech Stack:** TypeScript, Express, Yup, supertest, Vitest, `@fast-check/vitest`, Yarn v4 + Nx workspace.

**Spec:** `docs/superpowers/specs/2026-06-11-migrate-validator-next-design.md`. Re-read it before starting each phase.

---

## Conventions used in this plan

- **Project root:** `/Users/inad/dev/zero-logement-vacant.refactor-replace-yup-by-zod` — all paths in this plan are relative to it.
- **Run all tests via Nx:** `yarn nx test server -- <filter>` (filter is a Vitest path or pattern). Never `yarn test` from inside a workspace.
- **Vitest filter pattern:** the filter matches file paths, so `yarn nx test server -- signupLink-api` runs `controllers/test/signupLink-api.test.ts`.
- **Commit messages:** workspace-scoped (`feat(server)`, `refactor(server)`, `chore(server)`, `test(server)`, `feat(packages/schemas)` — see memory `feedback_commit_scopes`). English. No `--no-verify`.
- **Branch ops:** plain branches (`git switch -c`), not worktrees.
- **Test assertions for error responses:** legacy returns `{ errors: [...] }` with HTTP 400. `validatorNext` returns `{ name: "ValidationError", message, status, data: {...} }` with HTTP 400. The "fill tests" commit (step 2 of each controller triple) asserts the **legacy** body shape. The "migrate" commit (step 3) updates those assertions to the **validatorNext** shape as part of the migration. Status code (400) stays the same throughout.
- **Happy-path coverage stays unchanged across commits 2 and 3.** Only error-body assertions change.

---

## Phase 0 — Setup

### Task 0.1: Branch dance + commit spec

**Files:**
- Discard: `frontend/index.html`
- Commit: `docs/superpowers/specs/2026-06-11-migrate-validator-next-design.md`, `docs/superpowers/plans/2026-06-11-migrate-validator-next.md`

- [ ] **Step 1: Discard unstaged tweak on the old branch.**

```bash
git restore frontend/index.html
git status   # should now show only the new spec + plan files as untracked
```

- [ ] **Step 2: Switch to main, pull, delete old branch, create new branch.**

```bash
git stash push -u -m "docs spec+plan" -- docs/superpowers
git switch main
git pull --ff-only
git branch -D refactor/replace-yup-by-zod
git switch -c refactor/migrate-validator-next
git stash pop
```

Expected: clean main pulled, new branch created, spec + plan present as untracked files.

- [ ] **Step 3: Commit spec + plan.**

```bash
git add docs/superpowers/specs/2026-06-11-migrate-validator-next-design.md \
        docs/superpowers/plans/2026-06-11-migrate-validator-next.md
git commit -m "docs(server): plan express-validator → validatorNext migration"
```

---

### Task 0.2: Add `stripUnknown` to validatorNext

**Files:**
- Modify: `server/src/middlewares/validator-next.ts`
- Modify: `server/src/middlewares/test/validator-next.test.ts`

- [ ] **Step 1: Add the failing test.**

Append to `server/src/middlewares/test/validator-next.test.ts` inside the existing `describe('ValidatorNext middleware', () => { describe('Integration test', () => {` block (after the existing `it('should validate wrong input', ...)`):

```ts
    it('should strip unknown body keys', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({ geoCode: '12345', extra: 'should-be-stripped' })
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({ geoCode: '12345' });
      expect(body).not.toHaveProperty('extra');
    });
```

- [ ] **Step 2: Run test, confirm it fails.**

```bash
yarn nx test server -- validator-next
```

Expected: the new case fails because `extra` is still on the body.

- [ ] **Step 3: Modify `validator-next.ts`.**

Replace the `validateSync` call in `server/src/middlewares/validator-next.ts`:

```ts
const data = object(schema).validateSync(
  {
    body: request.body,
    params: request.params,
    query: request.query
  },
  { stripUnknown: true }
);
```

- [ ] **Step 4: Run tests, confirm green.**

```bash
yarn nx test server -- validator-next
```

Expected: all 3 cases pass (original 2 + strip-unknown).

- [ ] **Step 5: Commit.**

```bash
git add server/src/middlewares/validator-next.ts \
        server/src/middlewares/test/validator-next.test.ts
git commit -m "feat(server): strip unknown keys in validatorNext"
```

---

## Phase 1 — Small controllers

Each small controller follows the same triple-commit pattern. **Task 1.1 (signupLink) is the fully-worked template.** Tasks 1.2–1.5 list the per-controller specifics and reference Task 1.1 for the procedural shape.

### Task 1.1 — signupLink (PILOT, fully detailed)

**Routes touched (in `server/src/routers/unprotected.ts`):**

| Method+path | Validators today | Replacement |
|---|---|---|
| `POST /signup-links` | `signupLinkController.createValidators` (`body('email').isEmail()`) | `validatorNext.validate({ body: object({ email: schemas.email.required() }) })` |
| `GET /signup-links/:id` | `signupLinkController.showValidators` (`param('id').isString().notEmpty()`) | `validatorNext.validate({ params: object({ id: string().required() }) })` |

**Test file relocation:** `server/src/controllers/signupLinkController.test.ts` → `server/src/controllers/test/signupLink-api.test.ts`.

**Files:**
- Move: `server/src/controllers/signupLinkController.test.ts` → `server/src/controllers/test/signupLink-api.test.ts`
- Modify: `server/src/controllers/test/signupLink-api.test.ts` (add HTTP-layer cases)
- Modify: `server/src/controllers/signupLinkController.ts` (remove `*Validators` exports)
- Modify: `server/src/routers/unprotected.ts` (swap `validator.validate` → `validatorNext.validate`)

#### Commit A — relocate test

- [ ] **Step 1: Move the test file.**

```bash
git mv server/src/controllers/signupLinkController.test.ts \
       server/src/controllers/test/signupLink-api.test.ts
```

- [ ] **Step 2: Inspect imports — fix any `../` paths the move broke.**

Open `server/src/controllers/test/signupLink-api.test.ts`. The file now sits one directory deeper. Any imports of the form `from './...'` or `from '../...'` need an extra `../`. Imports using the `~/` alias are unchanged.

Run:

```bash
yarn nx typecheck server
```

Expected: no errors. If any, fix the broken relative imports.

- [ ] **Step 3: Run the test from its new location.**

```bash
yarn nx test server -- signupLink-api
```

Expected: same results as before the move (every existing case passes).

- [ ] **Step 4: Commit.**

```bash
git add server/src/controllers/test/signupLink-api.test.ts \
        server/src/controllers/signupLinkController.test.ts
git commit -m "chore(server): relocate signupLink test to controllers/test/signupLink-api.test.ts"
```

#### Commit B — fill HTTP-layer tests against legacy

- [ ] **Step 1: Audit existing coverage.**

Open `server/src/controllers/test/signupLink-api.test.ts`. Check whether each route is exercised through `request(app)` (supertest). If the file unit-tests the controller functions directly (importing `signupLinkController.create` and calling it), it has to be rewritten to drive the HTTP layer through the actual Express app. (Look for the existing pattern in `controllers/test/owner-api.test.ts` — it imports the app via `~/server` or builds one with the actual routers.)

- [ ] **Step 2: Add or augment cases asserting validation behavior against legacy code.**

Required cases (assuming HTTP-layer coverage exists; otherwise add the supertest scaffold first):

```ts
import { constants } from 'http2';
import request from 'supertest';
// Existing test imports for the Express app — match the pattern used in other
// controllers/test/*-api.test.ts files in this repo.

describe('POST /signup-links — validation', () => {
  it('returns 400 when body.email is missing', async () => {
    const { status, body } = await request(app)
      .post('/signup-links')
      .send({})
      .set('Content-Type', 'application/json');

    expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    expect(body).toMatchObject({ errors: expect.any(Array) }); // legacy shape
  });

  it('returns 400 when body.email is not an email', async () => {
    const { status, body } = await request(app)
      .post('/signup-links')
      .send({ email: 'not-an-email' })
      .set('Content-Type', 'application/json');

    expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    expect(body).toMatchObject({ errors: expect.any(Array) });
  });
});

describe('GET /signup-links/:id — validation', () => {
  it('returns 400 when id is empty', async () => {
    const { status, body } = await request(app)
      .get('/signup-links/')   // trailing slash → no :id captured; route may 404, not 400
      .set('Content-Type', 'application/json');

    // If the route 404s instead of 400 at this layer (because the path doesn't
    // match), drop this case and keep only the success case below — only assert
    // what the current legacy code actually does.
    if (status === constants.HTTP_STATUS_BAD_REQUEST) {
      expect(body).toMatchObject({ errors: expect.any(Array) });
    } else {
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    }
  });

  // Add a successful-fetch case if not already covered — the migration must
  // keep the happy path identical.
});
```

> Important: **only assert what the current legacy code does**. If `validator.validate` doesn't actually 400 on a particular malformed input (because no validator rule covers it), don't add a test asserting it does. The point of this commit is the regression net, not new behaviour.

- [ ] **Step 3: Run tests to confirm they pass against legacy.**

```bash
yarn nx test server -- signupLink-api
```

Expected: all cases (existing + new) pass on unchanged controller/router code.

- [ ] **Step 4: Commit.**

```bash
git add server/src/controllers/test/signupLink-api.test.ts
git commit -m "test(server): cover signupLink validation surface against legacy"
```

#### Commit C — migrate

- [ ] **Step 1: Update `signupLinkController.ts` — remove express-validator.**

Edit `server/src/controllers/signupLinkController.ts`:

Remove the import and the two `*Validators` exports:

```diff
-import { body, param, ValidationChain } from 'express-validator';
...
-const createValidators: ValidationChain[] = [body('email').isEmail()];
...
-const showValidators: ValidationChain[] = [param('id').isString().notEmpty()];

 const signupLinkController = {
   create,
-  createValidators,
-  show,
-  showValidators
+  show
 };
```

- [ ] **Step 2: Update `server/src/routers/unprotected.ts` — swap validators.**

Locate the signup-link routes (use `grep -n 'signup-links' server/src/routers/unprotected.ts`). Replace the legacy validator wiring:

```diff
+import { object, string } from 'yup';
+import schemas from '@zerologementvacant/schemas';
+import validatorNext from '~/middlewares/validator-next';
...
 router.post(
   '/signup-links',
-  signupLinkController.createValidators,
-  validator.validate,
+  validatorNext.validate({
+    body: object({ email: schemas.email.required() })
+  }),
   signupLinkController.create
 );

 router.get(
   '/signup-links/:id',
-  signupLinkController.showValidators,
-  validator.validate,
+  validatorNext.validate({
+    params: object({ id: string().required() })
+  }),
   signupLinkController.show
 );
```

(`schemas.email` already exists in `packages/schemas/src/email.ts`; `string`/`object` come from `yup`. Imports at the top of the file may already exist — don't duplicate them.)

- [ ] **Step 3: Update tests for new error shape.**

In `server/src/controllers/test/signupLink-api.test.ts`, change each error-shape assertion from the legacy `{ errors: [...] }` to the validatorNext shape:

```diff
- expect(body).toMatchObject({ errors: expect.any(Array) });
+ expect(body).toMatchObject({ name: 'ValidationError' });
```

The status (400) and happy-path assertions stay unchanged.

- [ ] **Step 4: Run tests, expect pass.**

```bash
yarn nx test server -- signupLink-api
yarn nx typecheck server
```

Expected: all pass.

- [ ] **Step 5: Commit.**

```bash
git add server/src/controllers/signupLinkController.ts \
        server/src/routers/unprotected.ts \
        server/src/controllers/test/signupLink-api.test.ts
git commit -m "refactor(server): migrate signupLink to validatorNext"
```

---

### Task 1.2 — resetLink

**Procedural pattern:** identical to Task 1.1. Follow commits A, B, C.

**Routes (in `server/src/routers/unprotected.ts`):**

| Method+path | Validators today | Replacement |
|---|---|---|
| `POST /reset-links` | `resetLinkController.createValidators` (`body('email').isEmail()`) | `validatorNext.validate({ body: object({ email: schemas.email.required() }) })` |
| `GET /reset-links/:id` | `resetLinkController.showValidators` (`param('id').isString().notEmpty().isAlphanumeric()`) | `validatorNext.validate({ params: object({ id: string().matches(/^[a-zA-Z0-9]+$/).required() }) })` |

**Test file move:** `server/src/controllers/resetLinkController.test.ts` → `server/src/controllers/test/resetLink-api.test.ts`.

**Tests to fill (commit B):**
- `POST /reset-links` returns 400 on missing email
- `POST /reset-links` returns 400 on malformed email
- `GET /reset-links/:id` returns 400 on non-alphanumeric `id` (e.g. `/reset-links/abc!def`)
- Happy-path cases existing in the legacy test stay.

**Commit messages:**
```
chore(server): relocate resetLink test to controllers/test/resetLink-api.test.ts
test(server): cover resetLink validation surface against legacy
refactor(server): migrate resetLink to validatorNext
```

---

### Task 1.3 — prospect

**Procedural pattern:** identical to Task 1.1.

**Routes (in `server/src/routers/unprotected.ts`):**

| Method+path | Validators today | Replacement |
|---|---|---|
| `PUT /prospects/:id` | `prospectController.createProspectValidator` (`param('id').isString().notEmpty().isAlphanumeric().isLength({ min: SIGNUP_LINK_LENGTH, max: SIGNUP_LINK_LENGTH })`) | `validatorNext.validate({ params: object({ id: string().matches(/^[a-zA-Z0-9]+$/).length(SIGNUP_LINK_LENGTH).required() }) })` |
| `GET /prospects/:email` | `prospectController.showProspectValidator` (`param('email').notEmpty().isEmail()`) | `validatorNext.validate({ params: object({ email: schemas.email.required() }) })` |

`SIGNUP_LINK_LENGTH` comes from `~/models/SignupLinkApi` — import it in `unprotected.ts`.

**Test file move:** `server/src/controllers/prospectController.test.ts` → `server/src/controllers/test/prospect-api.test.ts`.

**Tests to fill (commit B):**
- `PUT /prospects/:id` returns 400 on `id` shorter than `SIGNUP_LINK_LENGTH`
- `PUT /prospects/:id` returns 400 on `id` with non-alphanumeric chars
- `GET /prospects/:email` returns 400 on malformed email
- Happy paths existing in the legacy test stay.

**Commit messages:**
```
chore(server): relocate prospect test to controllers/test/prospect-api.test.ts
test(server): cover prospect validation surface against legacy
refactor(server): migrate prospect to validatorNext
```

---

### Task 1.4 — locality

**Procedural pattern:** identical to Task 1.1.

**Routes (in `server/src/routers/protected.ts`):**

| Method+path | Validators today | Replacement |
|---|---|---|
| `GET /localities/:geoCode` | `localityController.getLocalityValidators` (`param('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 })`) | `validatorNext.validate({ params: object({ geoCode: schemas.geoCode.required() }) })` |
| `GET /localities` | `localityController.listLocalitiesValidators` (`query('establishmentId').notEmpty().isUUID()`) | `validatorNext.validate({ query: object({ establishmentId: string().uuid().required() }) })` |
| `PUT /localities/:geoCode/tax` | `localityController.updateLocalityTaxValidators` (4 chain entries) | `validatorNext.validate({ params: object({ geoCode: schemas.geoCode.required() }), body: object({ taxKind: string().oneOf(['THLV','None']).required(), taxRate: number().when('taxKind', { is: 'THLV', then: (s) => s.required(), otherwise: (s) => s.strip() }) }) })` |

`schemas.geoCode` already exists (`packages/schemas/src/geo-code.ts`).

**Test file move:** `server/src/controllers/localityController.test.ts` → `server/src/controllers/test/locality-api.test.ts`.

**Tests to fill (commit B):**
- `GET /localities/:geoCode` 400 on `geoCode` length ≠ 5
- `GET /localities/:geoCode` 400 on non-alphanumeric `geoCode`
- `GET /localities` 400 on missing `establishmentId`
- `GET /localities` 400 on non-UUID `establishmentId`
- `PUT /localities/:geoCode/tax` 400 on invalid `taxKind`
- `PUT /localities/:geoCode/tax` 400 when `taxKind=THLV` and `taxRate` missing
- Happy paths existing in the legacy test stay.

**Caveat:** the existing legacy test may be unit-style (`controllers/localityController.test.ts` calling functions directly). If so, the commit B work includes rewriting it to HTTP-layer supertest. Check first; if it's already supertest-based, just augment.

**Commit messages:**
```
chore(server): relocate locality test to controllers/test/locality-api.test.ts
test(server): cover locality validation surface against legacy
refactor(server): migrate locality to validatorNext
```

---

### Task 1.5 — geo

**Procedural pattern:** identical to Task 1.1.

**Routes:** open `server/src/controllers/geoController.ts`, list the exported `*Validators` arrays and their routes in `server/src/routers/protected.ts` (search `geoController.`). For each:
- delete the `*Validators` export
- replace `validator.validate` wiring with `validatorNext.validate({...})` driven by `schemas.geoCode`, `schemas.id`, or inline Yup as appropriate.

**Test file move:** `server/src/controllers/geoController.test.ts` → `server/src/controllers/test/geo-api.test.ts`. Audit for unit-style; convert to supertest if needed.

**Tests to fill (commit B):** one 400-on-bad-input case per route's validation surface, plus a happy-path case per route.

**Commit messages:**
```
chore(server): relocate geo test to controllers/test/geo-api.test.ts
test(server): cover geo validation surface against legacy
refactor(server): migrate geo to validatorNext
```

---

### Phase 1 verification gate

After Task 1.5, before moving to Phase 2:

```bash
yarn nx test server -- "signupLink-api|resetLink-api|prospect-api|locality-api|geo-api"
yarn nx typecheck server
yarn nx lint server
grep -rn "from 'express-validator'" server/src/controllers/{signupLinkController,resetLinkController,prospectController,localityController,geoController}.ts
```

Last grep must return no matches.

---

## Phase 2 — Cross-cutting schema moves

### Task 2.1 — Move `paginationSchema` to `packages/schemas/`

**Files:**
- Create: `packages/schemas/src/pagination.ts`
- Create: `packages/schemas/src/test/pagination.test.ts`
- Modify: `packages/schemas/src/index.ts` (export)
- Modify: `server/src/models/PaginationApi.ts` (drop the schema, re-export from the package, keep runtime helpers)

#### Commit A — author the schema in `packages/schemas/`

- [ ] **Step 1: Create `packages/schemas/src/pagination.ts`.**

```ts
import { boolean, number, object } from 'yup';

export const MAX_PER_PAGE = 500;

export const pagination = object({
  paginate: boolean().default(true),
  page: number().integer().min(1).default(1),
  perPage: number().integer().min(1).max(MAX_PER_PAGE).default(50)
});
```

- [ ] **Step 2: Wire export in `packages/schemas/src/index.ts`.**

Add an import alongside the existing ones and include `pagination` (and re-export `MAX_PER_PAGE`):

```diff
+import { pagination } from './pagination';
...
 const schemas = {
   ...
+  pagination,
   ...
 };
+
+export { MAX_PER_PAGE } from './pagination';

 export default schemas;
```

- [ ] **Step 3: Create the property-based test.**

`packages/schemas/src/test/pagination.test.ts`:

```ts
import { fc, test } from '@fast-check/vitest';

import { MAX_PER_PAGE, pagination } from '../pagination';

describe('pagination schema', () => {
  test.prop({
    paginate: fc.boolean(),
    page: fc.integer({ min: 1, max: 10_000 }),
    perPage: fc.integer({ min: 1, max: MAX_PER_PAGE })
  })('accepts valid inputs', (input) => {
    expect(pagination.validateSync(input)).toEqual(input);
  });

  test.prop({
    page: fc.integer({ max: 0 })
  })('rejects page < 1', ({ page }) => {
    expect(() => pagination.validateSync({ page })).toThrow();
  });

  test.prop({
    perPage: fc.integer({ min: MAX_PER_PAGE + 1, max: MAX_PER_PAGE + 10_000 })
  })('rejects perPage > MAX_PER_PAGE', ({ perPage }) => {
    expect(() => pagination.validateSync({ perPage })).toThrow();
  });

  it('applies defaults', () => {
    expect(pagination.validateSync({})).toEqual({
      paginate: true,
      page: 1,
      perPage: 50
    });
  });
});
```

- [ ] **Step 4: Run tests.**

```bash
yarn nx test packages-schemas -- pagination
```

Expected: green.

- [ ] **Step 5: Commit.**

```bash
git add packages/schemas/src/pagination.ts \
        packages/schemas/src/test/pagination.test.ts \
        packages/schemas/src/index.ts
git commit -m "feat(packages/schemas): add pagination schema + property tests"
```

#### Commit B — drop the schema from `server/src/models/PaginationApi.ts`

- [ ] **Step 1: Edit `server/src/models/PaginationApi.ts`.**

Remove the inline `paginationSchema` and import it from the package instead. Keep `queryValidators` (express-validator) for now — Phase 6 will delete it once all consumers are migrated. Keep all runtime helpers.

```diff
-import { boolean, number, object } from 'yup';
+import { pagination as paginationSchema } from '@zerologementvacant/schemas/pagination';
...
-export const MAX_PER_PAGE = 500;
+export { MAX_PER_PAGE } from '@zerologementvacant/schemas/pagination';

 export const queryValidators: ValidationChain[] = [
   ...
 ];

-export const paginationSchema = object({
-  paginate: boolean().default(true),
-  page: number().integer().min(1).default(1),
-  perPage: number().integer().min(1).max(MAX_PER_PAGE).default(50)
-});
+export { paginationSchema };
```

> If `@zerologementvacant/schemas/pagination` deep-import doesn't resolve cleanly because the package only exports its default barrel, change the import to:
> ```ts
> import schemas, { MAX_PER_PAGE } from '@zerologementvacant/schemas';
> export const paginationSchema = schemas.pagination;
> export { MAX_PER_PAGE };
> ```
> and remove the deep import.

- [ ] **Step 2: Run server tests + typecheck.**

```bash
yarn nx test server
yarn nx typecheck server
```

Expected: no behavior change; every consumer of `paginationSchema` from `~/models/PaginationApi` keeps working because the re-export name is preserved.

- [ ] **Step 3: Commit.**

```bash
git add server/src/models/PaginationApi.ts
git commit -m "refactor(server): consume pagination schema from @zerologementvacant/schemas"
```

---

### Task 2.2 — Move `sortSchema` to `packages/schemas/`

**Pattern:** identical to Task 2.1.

**Files:**
- Create: `packages/schemas/src/sort.ts`
- Create: `packages/schemas/src/test/sort.test.ts`
- Modify: `packages/schemas/src/index.ts` (export `sort`)
- Modify: `server/src/models/SortApi.ts` (drop the schema, re-export from the package)

#### Commit A — author the schema

- [ ] **Step 1: Create `packages/schemas/src/sort.ts`.**

Copy the Yup definition from `server/src/models/SortApi.ts` (the `sortSchema` block, lines 72–85). It uses only Yup primitives, no `~/` imports — safe to move as-is. Rename the export from `sortSchema` to `sort` for consistency with other schemas in the package.

```ts
import { array, object, string } from 'yup';

export const sort = object({
  sort: array()
    .transform((value) =>
      typeof value === 'string' ? value.split(',') : value
    )
    .of(
      string().test({
        name: 'comma-separated values',
        test(value) {
          return value ? /^-?[a-zA-Z]+$/i.test(value) : true;
        }
      })
    )
});
```

- [ ] **Step 2: Wire export in `packages/schemas/src/index.ts`** (analogous to Task 2.1).

- [ ] **Step 3: Create `packages/schemas/src/test/sort.test.ts`.**

```ts
import { fc, test } from '@fast-check/vitest';

import { sort } from '../sort';

describe('sort schema', () => {
  test.prop({
    sort: fc.array(
      fc.string({ minLength: 1, maxLength: 12 })
        .filter((s) => /^-?[a-zA-Z]+$/.test(s))
    )
  })('accepts arrays of valid keys', ({ sort: input }) => {
    expect(sort.validateSync({ sort: input })).toEqual({ sort: input });
  });

  it('transforms a comma-separated string to an array', () => {
    expect(sort.validateSync({ sort: 'owner,-rawAddress' as unknown as string[] }))
      .toEqual({ sort: ['owner', '-rawAddress'] });
  });

  test.prop({
    bad: fc.string().filter((s) => !/^-?[a-zA-Z]*$/.test(s) && s.length > 0)
  })('rejects keys with invalid characters', ({ bad }) => {
    expect(() => sort.validateSync({ sort: [bad] })).toThrow();
  });
});
```

- [ ] **Step 4: Run tests.**

```bash
yarn nx test packages-schemas -- sort
```

- [ ] **Step 5: Commit.**

```bash
git add packages/schemas/src/sort.ts \
        packages/schemas/src/test/sort.test.ts \
        packages/schemas/src/index.ts
git commit -m "feat(packages/schemas): add sort schema + property tests"
```

#### Commit B — drop the schema from `server/src/models/SortApi.ts`

- [ ] **Step 1: Edit `server/src/models/SortApi.ts` analogous to Task 2.1 Commit B.** Re-export `sortSchema` from `@zerologementvacant/schemas`. Keep `parse`, `sortQuery`, and the express-validator `queryValidators`.

- [ ] **Step 2: Run server tests + typecheck.**

```bash
yarn nx test server
yarn nx typecheck server
```

- [ ] **Step 3: Commit.**

```bash
git add server/src/models/SortApi.ts
git commit -m "refactor(server): consume sort schema from @zerologementvacant/schemas"
```

---

## Phase 3 — Controllers using pagination/sort

### Task 3.1 — owner

**Procedural pattern:** Task 1.1 triple, no test relocation needed (already at `controllers/test/owner-api.test.ts`).

**Routes:** read `server/src/controllers/ownerController.ts` for the `*Validators` exports, find each one's wiring in `server/src/routers/protected.ts`. The list typically includes a `list` route using `paginationSchema` for query coercion.

**Strategy per route:**
- Routes consuming pagination → `validatorNext.validate({ query: paginationSchema.concat(object({ ... })) })` (or import `paginationSchema` and use it directly when it's the entire query schema).
- `:id`-style routes → `validatorNext.validate({ params: object({ id: schemas.id }) })`.
- Body-bearing routes → use an existing schema from `packages/schemas/` or write a new one and follow the Task 4.1 / Task 4.2 pattern below for adding it to the package.

**Tests to fill (commit B):**
- One 400 case per existing route's validation rule.
- Happy paths already covered.

**No "relocate" commit needed.** Sequence is two commits:
```
test(server): cover owner validation surface against legacy
refactor(server): migrate owner to validatorNext
```

---

### Task 3.2 — user

**Procedural pattern:** same as Task 3.1, no test relocation needed.

**Routes:** read `server/src/controllers/userController.ts` for `*Validators` exports and trace each in `server/src/routers/protected.ts`. Use `schemas.userUpdatePayload` and `schemas.userFilters` from `packages/schemas/` where applicable.

**Tests to fill (commit B):** one 400 case per route's validation rule. Happy paths already covered.

**Commit messages:**
```
test(server): cover user validation surface against legacy
refactor(server): migrate user to validatorNext
```

---

### Phase 3 verification gate

```bash
yarn nx test server -- "owner-api|user-api"
yarn nx typecheck server
grep -rn "from 'express-validator'" server/src/controllers/{ownerController,userController}.ts
```

Last grep must return no matches.

---

## Phase 4 — New filter schemas + their consumers

### Task 4.1 — `housingFiltersSchema` + group migration

#### Commit A — author `housingFiltersSchema`

**Files:**
- Create: `packages/schemas/src/housing-filters-payload.ts` (the *request payload* — distinct from the existing `housing-filters.ts` which models the DTO)
- Create: `packages/schemas/src/test/housing-filters-payload.test.ts`
- Modify: `packages/schemas/src/index.ts`

Reason for the separate file: the existing `housing-filters.ts` in `packages/schemas/` models the frontend `HousingFiltersDTO` shape used by `housingFilters` validation. This task needs a *server request validation* schema mirroring the field list in `server/src/models/HousingFiltersApi.ts` (`HousingFiltersApi` interface). If after inspecting both you find they are functionally identical, skip creating a new schema and reuse `housingFilters` instead — leave a comment in the migration commit explaining the consolidation.

- [ ] **Step 1: Inspect existing `packages/schemas/src/housing-filters.ts` and the server's `HousingFiltersApi` shape.** Decide: reuse `schemas.housingFilters`, or author a new one.

- [ ] **Step 2 (path: reuse).** Skip Commit A. Jump to Commit B. Mention "reusing schemas.housingFilters" in the Commit B message.

- [ ] **Step 2 (path: new schema).** Create `packages/schemas/src/housing-filters-payload.ts` with a Yup object mirroring `HousingFiltersApi`'s field list (each field `.optional()`, array fields as `array().of(string()).optional()`, UUID fields as `array().of(string().uuid()).optional()`, etc.). Use the `validators(property)` body chain in `server/src/models/HousingFiltersApi.ts:65` as the field list reference — translate each `.custom(isArrayOf(isUUID))` to `array().of(string().uuid())`, each `.custom(isArrayOf(isString))` to `array().of(string())`, etc.

- [ ] **Step 3: Add property-based test** at `packages/schemas/src/test/housing-filters-payload.test.ts`, modeled on `packages/schemas/src/test/housing-filters.test.ts`.

- [ ] **Step 4: Wire export in `packages/schemas/src/index.ts`.**

- [ ] **Step 5: Run tests.**

```bash
yarn nx test packages-schemas -- housing-filters
```

- [ ] **Step 6: Commit.**

```bash
git add packages/schemas/src/housing-filters-payload.ts \
        packages/schemas/src/test/housing-filters-payload.test.ts \
        packages/schemas/src/index.ts
git commit -m "feat(packages/schemas): add housing filters payload schema + property tests"
```

#### Commit B — relocate group test

`server/src/controllers/groupController.test.ts` → `server/src/controllers/test/group-api.test.ts`.

Follow Task 1.1 Commit A pattern.

```
chore(server): relocate group test to controllers/test/group-api.test.ts
```

#### Commit C — fill group tests against legacy

Routes are in `server/src/controllers/groupController.ts` (`*Validators` exports) and wired in `server/src/routers/protected.ts` (search `groupController.`). Cover 400 cases per validator rule; legacy `{ errors: [...] }` shape.

```
test(server): cover group validation surface against legacy
```

#### Commit D — migrate group

Remove `*Validators` from `groupController.ts`. Swap router wiring to `validatorNext.validate({ body: schemas.groupCreationPayload })` for create, `validatorNext.validate({ params: object({ id: schemas.id }), body: <housing-filters-payload or housingFilters> })` for the add/remove-housing routes. Update test assertions from `{ errors: ... }` to `{ name: 'ValidationError' }`.

```
refactor(server): migrate group to validatorNext
```

---

### Task 4.2 — `campaignFiltersSchema` + campaign migration

#### Commit A — author `campaignFiltersSchema`

**Files:**
- Create: `packages/schemas/src/campaign-filters.ts`
- Create: `packages/schemas/src/test/campaign-filters.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: Author schema.** From `server/src/models/CampaignFiltersApi.ts`, the field list is just `groups` (an optional comma-delimited string of UUIDs, transformed to an array). Yup version:

```ts
import { array, object, string } from 'yup';

export const campaignFilters = object({
  groups: array()
    .transform((value) =>
      typeof value === 'string' ? value.split(',') : value
    )
    .of(string().uuid())
    .optional()
});
```

- [ ] **Step 2: Property test** at `packages/schemas/src/test/campaign-filters.test.ts`:

```ts
import { fc, test } from '@fast-check/vitest';

import { campaignFilters } from '../campaign-filters';

describe('campaign filters schema', () => {
  test.prop({
    groups: fc.array(fc.uuid({ version: 4 }))
  })('accepts arrays of UUIDs', ({ groups }) => {
    expect(campaignFilters.validateSync({ groups })).toEqual({ groups });
  });

  it('transforms a comma-separated string to an array', () => {
    const uuid1 = '00000000-0000-4000-8000-000000000001';
    const uuid2 = '00000000-0000-4000-8000-000000000002';
    expect(campaignFilters.validateSync({ groups: `${uuid1},${uuid2}` as any }))
      .toEqual({ groups: [uuid1, uuid2] });
  });

  test.prop({ bad: fc.string().filter((s) => s.length > 0 && !/^[0-9a-f-]+$/i.test(s)) })(
    'rejects non-UUID entries',
    ({ bad }) => {
      expect(() => campaignFilters.validateSync({ groups: [bad] })).toThrow();
    }
  );
});
```

- [ ] **Step 3: Wire export in `packages/schemas/src/index.ts`.**

- [ ] **Step 4: Run tests.**

```bash
yarn nx test packages-schemas -- campaign-filters
```

- [ ] **Step 5: Commit.**

```bash
git add packages/schemas/src/campaign-filters.ts \
        packages/schemas/src/test/campaign-filters.test.ts \
        packages/schemas/src/index.ts
git commit -m "feat(packages/schemas): add campaign filters schema + property tests"
```

#### Commit B — fill campaign tests against legacy

Campaign tests are already at `controllers/test/campaign-api.test.ts` — no relocation. Audit for validation-surface coverage. Routes use a mix of `campaignFiltersValidators` (from `CampaignFiltersApi.ts`), `SortApi.queryValidators`, and per-controller `*Validators`. Cover one 400 per route's rule; legacy shape.

```
test(server): cover campaign validation surface against legacy
```

#### Commit C — migrate campaign

Remove every `*Validators` from `campaignController.ts`. Swap router wiring (for each route in `protected.ts`'s campaign section):
- list → `validatorNext.validate({ query: schemas.campaignFilters.concat(schemas.sort) })` (or merged inline)
- get/delete by id → `validatorNext.validate({ params: object({ id: schemas.id }) })`
- update → `validatorNext.validate({ params: object({ id: schemas.id }), body: schemas.campaignUpdateNextPayload })` (already in use for some routes)
- create-from-group → already validatorNext-based (no change).

Update test assertions for new error shape.

```
refactor(server): migrate campaign to validatorNext
```

---

### Phase 4 verification gate

```bash
yarn nx test server -- "group-api|campaign-api"
yarn nx test packages-schemas
yarn nx typecheck server
grep -rn "from 'express-validator'" server/src/controllers/{groupController,campaignController}.ts \
        server/src/models/CampaignFiltersApi.ts
```

Last grep should still match `CampaignFiltersApi.ts` (its chain is dropped in Phase 6). The controllers must be clean.

---

## Phase 5 — housing + housingExport

This is the biggest task because housing has the largest test file (2113 lines) and `housingExport` has no test today. Plan: four commits.

### Task 5.1 — housing + housingExport migration

#### Commit A — fill housing validation tests against legacy

`controllers/test/housing-api.test.ts` exists — no relocation. Audit it route-by-route:
1. List every route in `protected.ts`'s housing section that uses `housingController.*Validators` or `housingExportController.*Validators` (`grep -n 'housingController\|housingExportController' server/src/routers/protected.ts`).
2. For each, identify the validation rules in `housingController.ts` and `housingExportController.ts`.
3. For each rule not already tested, add a supertest case asserting HTTP 400 + legacy body shape.

This is mechanical but bulky — expect 15–25 new test cases.

```
test(server): cover housing validation surface against legacy
```

#### Commit B — write housingExport API tests from scratch

Create `server/src/controllers/test/housingExport-api.test.ts`. Use `controllers/test/owner-api.test.ts` as the scaffolding template (Express app boot, auth, fixtures).

Cover:
- Each export route in `protected.ts`'s housingExport section (`grep -n 'housingExportController' server/src/routers/protected.ts`).
- Happy path: 200 + correct content-disposition or content-type per route.
- Validation paths: one 400 per validator rule, legacy body shape.

```
test(server): add housingExport API tests
```

#### Commit C — migrate housing + housingExport

Remove `*Validators` from both controllers (`housingController.ts`, `housingExportController.ts`). Rewire each housing/housingExport route in `protected.ts`:
- list housings → `validatorNext.validate({ query: <housingFilters or housing-filters-payload>.concat(paginationSchema).concat(sortSchema) })`
- get housing → `validatorNext.validate({ params: object({ id: schemas.id }) })`
- update housing → `validatorNext.validate({ params: object({ id: schemas.id }), body: schemas.housingUpdatePayload })`
- batch update → `validatorNext.validate({ body: schemas.housingBatchUpdatePayload })`
- export routes → params/body schemas per route's current validators
- Tests: update error-shape assertions from `{ errors: ... }` to `{ name: 'ValidationError' }` for both files.

```
refactor(server): migrate housing and housingExport to validatorNext
```

---

### Phase 5 verification gate

```bash
yarn nx test server -- "housing-api|housingExport-api"
yarn nx typecheck server
yarn nx lint server
grep -rn "from 'express-validator'" server/src/controllers/{housingController,housingExportController}.ts
```

Last grep must return no matches.

---

## Phase 6 — Cleanup

> **Ordering matters.** The model files (`PaginationApi.ts`, `SortApi.ts`, `HousingFiltersApi.ts`, `CampaignFiltersApi.ts`) import from `~/utils/validators` and `express-validator`. Prune them first (Task 6.1), then delete the legacy plumbing (Task 6.2). Reversing the order breaks typecheck.

### Task 6.1 — Prune `express-validator` chains from model files

**Files to modify:**
- `server/src/models/PaginationApi.ts`
- `server/src/models/SortApi.ts`
- `server/src/models/HousingFiltersApi.ts`
- `server/src/models/CampaignFiltersApi.ts`

- [ ] **Step 1: For each file, delete the `*Validators` / `queryValidators` / `validators()` export and the `express-validator` + `~/utils/validators` imports.**

- [ ] **Step 2: Update each default export to drop the chain reference.** For example in `PaginationApi.ts`:

```diff
 export default {
   create: createPagination,
   query: paginationQuery,
-  queryValidators,
   schema: paginationSchema
 };
```

- [ ] **Step 3: Find and clean up any other consumers of those chain exports.**

```bash
grep -rn "queryValidators\|campaignFiltersValidators\|HousingFiltersApi\\.validators" server/src
```

Any matches are downstream consumers that need their imports removed (likely from `protected.ts` import block since the validate calls are already gone — only stale imports remain).

- [ ] **Step 4: Typecheck + tests.**

```bash
yarn nx typecheck server
yarn nx test server
```

- [ ] **Step 5: Commit.**

```bash
git add server/src/models/PaginationApi.ts \
        server/src/models/SortApi.ts \
        server/src/models/HousingFiltersApi.ts \
        server/src/models/CampaignFiltersApi.ts \
        server/src/routers/protected.ts \
        server/src/routers/unprotected.ts
git commit -m "chore(server): remove express-validator chains from shared model files"
```

---

### Task 6.2 — Delete legacy middleware and helpers

**Files to delete:**
- `server/src/middlewares/validator.ts`
- `server/src/middlewares/test/validator.test.ts`
- `server/src/utils/validators.ts`

- [ ] **Step 1: Verify no remaining consumers.**

```bash
grep -rn "from '~/middlewares/validator'\b\|from '../middlewares/validator'\b\|from '~/utils/validators'" server/src
grep -rn "validator\.validate" server/src
```

Both must return no results. (Pre-Task 6.1 the model-file imports of `~/utils/validators` would still show; this is why 6.1 runs first.)

- [ ] **Step 2: Delete files.**

```bash
git rm server/src/middlewares/validator.ts \
       server/src/middlewares/test/validator.test.ts \
       server/src/utils/validators.ts
```

- [ ] **Step 3: Also clean up `import validator from '~/middlewares/validator'` lines in routers (already-dead imports left behind).**

```bash
grep -rn "import validator from '~/middlewares/validator'" server/src
```

Remove each match.

- [ ] **Step 4: Typecheck + tests.**

```bash
yarn nx typecheck server
yarn nx test server
```

Expected: green.

- [ ] **Step 5: Commit.**

```bash
git add server/src/routers/protected.ts server/src/routers/unprotected.ts
git commit -m "chore(server): remove legacy validator middleware and helpers"
```

---

### Task 6.3 — Remove the dependency

**Files:**
- Modify: `server/package.json`
- Regenerate: `yarn.lock`

- [ ] **Step 1: Remove from `server/package.json`.**

```bash
yarn workspace @zerologementvacant/server remove express-validator
```

- [ ] **Step 2: Final smoke.**

```bash
yarn nx test server
yarn nx test packages-schemas
yarn nx typecheck server
yarn nx lint server
grep -rn "express-validator" server/src packages/schemas/src
```

Last grep must return no results.

- [ ] **Step 3: Commit.**

```bash
git add server/package.json yarn.lock
git commit -m "chore(server): remove express-validator dependency"
```

---

## Final PR verification

Before pushing:

```bash
yarn nx run-many -t test --projects=server,packages-schemas
yarn nx typecheck server
yarn nx lint server

# Sanity: nothing slipped through
grep -rn "express-validator" server/ packages/

# Commit log should read cleanly top-to-bottom
git log --oneline main..HEAD
```

Push and open the PR:

```bash
git push -u origin refactor/migrate-validator-next
gh pr create --title "refactor(server): migrate express-validator → validatorNext" --body "$(cat <<'EOF'
## Summary
- Removes `express-validator` from the server; every route now validated by `validatorNext` + Yup.
- Adds `{ stripUnknown: true }` to `validatorNext` so unknown body/query/params keys are silently stripped.
- Moves `paginationSchema` and `sortSchema` to `packages/schemas/` (with property-based tests). Adds `housingFiltersSchema` / `campaignFiltersSchema` to the package.
- Relocates legacy-location controller tests to `controllers/test/<base>-api.test.ts` and converts any unit-style cases to HTTP-layer supertest.
- Deletes `server/src/middlewares/validator.ts`, its test, and `server/src/utils/validators.ts`.

## Behavior changes
- **Validation error response body shape changes** from `{ errors: [...] }` (legacy) to `{ name: "ValidationError", message, status, data: {...} }` (validatorNext). Status code (400) and happy paths unchanged. **Follow-up needed on frontend consumers of 400 bodies.**
- Unknown body/query/params keys are now silently stripped instead of passed through.

## Test plan
- [ ] `yarn nx test server` green
- [ ] `yarn nx test packages-schemas` green
- [ ] `yarn nx typecheck server` clean
- [ ] `yarn nx lint server` clean
- [ ] Smoke a representative endpoint of each migrated controller against staging

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Then add labels + assign per CLAUDE.md:

```bash
gh pr edit <number> --add-label "server,refactor" --add-assignee "@me"
```

---

## Self-review notes

- All spec sections covered: setup (Phase 0), 11 controllers (Phases 1/3/4/5), cross-cutting schema moves (Phase 2), new filter schemas (Phase 4), cleanup (Phase 6).
- Risk #1 (error shape change) handled by the spec call-out and the explicit step in each migration commit that updates assertions.
- Risk #2 (stripUnknown) handled in Phase 0 Task 0.2.
- Risk #3 (`packages/schemas` shared with frontend) handled by keeping schemas framework-agnostic and authoring property-based tests in `packages/schemas/src/test/`.
- Risk #4 (`housingExport` has no test today) handled by Phase 5 Commit B.
- Risk #5 (unit-style legacy tests) handled by the "audit + rewrite if needed" step in each Commit A/B of each controller task.
