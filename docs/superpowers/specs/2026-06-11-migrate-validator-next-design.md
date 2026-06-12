# Migrate `express-validator` → `validatorNext` — design

## Context

The server has two request-validation stacks in parallel:

- **Legacy:** `express-validator` chains exported as `*Validators` arrays from controllers, run by `server/src/middlewares/validator.ts`.
- **Current:** `server/src/middlewares/validator-next.ts` with Yup `ObjectSchema`s declared inline at the router or imported from `@zerologementvacant/schemas`.

`backend-conventions.md` marks `express-validator` as legacy. This migration removes the legacy stack so all request validation runs through `validatorNext`, as a stepping stone toward a clean Yup → Zod swap later (one package to migrate instead of scattered chains).

## Goals

- Remove every `express-validator` import from `server/`.
- Delete `server/src/middlewares/validator.ts` and its test.
- Delete `server/src/utils/validators.ts` (express-validator helpers).
- Remove `express-validator` from `server/package.json` and `yarn.lock`.
- Every migrated route is regression-tested at the HTTP layer via supertest, with assertions covering both the happy path and the validation-error path.

## Non-goals

- Yup → Zod conversion (next migration).
- Refactoring controller business logic.
- Converting unit-style business-logic tests in `controllers/*Controller.test.ts` to supertest. Only the validation surface gets the relocate + rewrite treatment.
- Frontend changes (including any reaction to the new validation-error response shape — see Risks).
- `apps/front-e2e/`.

## Branch and PR

- Single PR on `refactor/migrate-validator-next`, cut from `main`.
- `refactor/replace-yup-by-zod` is deleted. Its only working-tree change is an unrelated unstaged `frontend/index.html` cache-busting tweak; that change is discarded.

Setup sequence:

```bash
git restore frontend/index.html
git switch main && git pull
git branch -D refactor/replace-yup-by-zod
git switch -c refactor/migrate-validator-next
```

## Scope inventory

11 controllers import `express-validator`:

`campaign`, `geo`, `group`, `housing`, `housingExport`, `locality`, `owner`, `prospect`, `resetLink`, `signupLink`, `user`.

4 shared model files import `express-validator`:

| File                                      | Yup schema today     | Action                                                    |
| ----------------------------------------- | -------------------- | --------------------------------------------------------- |
| `server/src/models/PaginationApi.ts`      | ✓ `paginationSchema` | move schema to `packages/schemas/`                        |
| `server/src/models/SortApi.ts`            | ✓ `sortSchema`       | move schema to `packages/schemas/`                        |
| `server/src/models/HousingFiltersApi.ts`  | ✗                    | author new `housingFiltersSchema` in `packages/schemas/`  |
| `server/src/models/CampaignFiltersApi.ts` | ✗                    | author new `campaignFiltersSchema` in `packages/schemas/` |

Routers: `server/src/routers/protected.ts` (53 `validator.validate` usages) and `server/src/routers/unprotected.ts` (14).

Test coverage today:

| Controller      | Test file location                         | Status          |
| --------------- | ------------------------------------------ | --------------- |
| `campaign`      | `controllers/test/campaign-api.test.ts`    | canonical       |
| `group`         | `controllers/groupController.test.ts`      | legacy location |
| `housing`       | `controllers/test/housing-api.test.ts`     | canonical       |
| `housingExport` | —                                          | **no test**     |
| `locality`      | `controllers/localityController.test.ts`   | legacy location |
| `owner`         | `controllers/test/owner-api.test.ts`       | canonical       |
| `prospect`      | `controllers/prospectController.test.ts`   | legacy location |
| `resetLink`     | `controllers/resetLinkController.test.ts`  | legacy location |
| `signupLink`    | `controllers/signupLinkController.test.ts` | legacy location |
| `user`          | `controllers/test/user-api.test.ts`        | canonical       |
| `geo`           | `controllers/geoController.test.ts`        | legacy location |

## Per-controller commit pattern

For each controller `<base>`:

1. **`chore(server): relocate <base> tests to controllers/test/<base>-api.test.ts`** — pure rename for legacy-location files. Skipped for controllers already in the canonical location.
2. **`test(server): rewrite <base> tests as HTTP-layer supertest`** — audit existing tests against the actual routes; for any route in `<base>`'s router section that lacks 400-on-bad-input coverage, add a supertest case that asserts the new `validatorNext` error shape (see Risks). Where existing tests bypass the middleware chain (calling controller functions directly), convert them to supertest so they exercise validation. **All assertions in this commit must pass against the legacy code.**
3. **`refactor(server): migrate <base> to validatorNext`** — delete the controller's `*Validators` exports (or the model file's chain exports it consumed), rewrite the relevant `protected.ts` / `unprotected.ts` blocks to use `validatorNext.validate({ body, params, query })` with imported schemas from `@zerologementvacant/schemas` (or, only when truly route-local, inline `object({ ... })` schemas). Re-run `yarn nx test server -- <base>`. Tests pass without modification.

The commit boundary is the regression-proof: a reviewer can `git checkout` commit 2 and confirm the new tests pass against legacy code; then `git checkout` commit 3 and confirm they still pass after the swap.

## Schema strategy

- All new and moved Yup schemas live in **`packages/schemas/`** (mirroring the existing pattern for `housingUpdatePayload`, `draftCreationPayload`, etc.).
- **Runtime helpers stay in `server/src/models/`** — `paginationQuery`, `sortQuery`, `parse`, `createPagination`, `MAX_PER_PAGE`, the `HousingFiltersApi` TypeScript type, etc.
- After each schema is added or moved, write **property-based tests with `@fast-check/vitest`** in `packages/schemas/src/test/<schema-name>.test.ts`, per `backend-conventions.md`. The tests pin: type coercion of query strings, default-value application, and rejection of malformed inputs.
- Schemas in `packages/schemas/` must remain framework-agnostic — no imports from `~/...`, no Node-only APIs.

## `validatorNext` modification

`validator-next.ts` receives one targeted change: pass `{ stripUnknown: true }` to `validateSync`. This strips unknown keys silently, matching `matchedData`'s effect from the legacy stack and giving downstream code a stable shape.

```ts
const data = object(schema).validateSync(
  { body: request.body, params: request.params, query: request.query },
  { stripUnknown: true }
);
```

Add a test in `middlewares/test/validator-next.test.ts` asserting unknown body/query keys are stripped from the downstream `request.body` / `request.query`.

The validatorNext **error response shape is the source of truth** for the migration: `{name, message, status, data: {...YupValidationError fields}}`. The legacy `{errors: [...]}` shape is not preserved.

## Commit sequence

```
chore(server): add { stripUnknown: true } to validatorNext + test

# Phase 1 — small controllers (no cross-cutting filters)
chore(server): relocate signupLink test to controllers/test/signupLink-api.test.ts
test(server):  cover signupLink validation surface
refactor(server): migrate signupLink to validatorNext

chore(server): relocate resetLink test ...
test(server):  cover resetLink ...
refactor(server): migrate resetLink ...

chore(server): relocate prospect test ...
test(server):  cover prospect ...
refactor(server): migrate prospect ...

chore(server): relocate locality test ...
test(server):  cover locality ...
refactor(server): migrate locality ...

chore(server): relocate geo test ...
test(server):  cover geo ...
refactor(server): migrate geo ...

# Phase 2 — cross-cutting schema moves
refactor(packages/schemas): move paginationSchema from server/src/models/PaginationApi
test(packages/schemas): property-based tests for paginationSchema
refactor(packages/schemas): move sortSchema from server/src/models/SortApi
test(packages/schemas): property-based tests for sortSchema

# Phase 3 — controllers that consume pagination/sort
chore(server): relocate owner test ... (skip — already canonical)
test(server):  cover owner ...
refactor(server): migrate owner ...

chore(server): relocate user test ... (skip — already canonical)
test(server):  cover user ...
refactor(server): migrate user ...

# Phase 4 — controllers needing new filter schemas
feat(packages/schemas): add housingFiltersSchema + property tests
chore(server): relocate group test to controllers/test/group-api.test.ts
test(server):  cover group ...
refactor(server): migrate group ...

feat(packages/schemas): add campaignFiltersSchema + property tests
chore(server): relocate campaign test ... (skip — already canonical)
test(server):  cover campaign ...
refactor(server): migrate campaign ...

# Phase 5 — the big one
chore(server): relocate housing test ... (skip — already canonical)
test(server):  cover housing validation surface
test(server):  add housingExport API tests from scratch
refactor(server): migrate housing + housingExport to validatorNext

# Phase 6 — cleanup
chore(server): delete legacy validator middleware + utils/validators
chore(server): prune express-validator chains from PaginationApi/SortApi/HousingFiltersApi/CampaignFiltersApi
chore(server): remove express-validator dependency
```

≈ 36 commits.

## Risks

1. **Error response shape changes.** `{errors: [...]}` → `{name, message, status, data}`. Frontend consumers of legacy 400 bodies will break. Out of scope for this PR; flag in the PR description for a follow-up frontend pass.
2. **Query-string coercion.** Yup `number()` / `boolean()` coerce by default, but `.default(...)` semantics differ from `express-validator`'s default-then-coerce chain. Property-based tests on `paginationSchema`, `sortSchema`, `housingFiltersSchema`, `campaignFiltersSchema` are the safety net.
3. **`packages/schemas` is consumed by the frontend.** Adding schemas there means the frontend's bundle gains them automatically — acceptable, since the frontend already imports from this package.
4. **`housingExport` has no test today.** Phase 5 writes its tests from scratch against the legacy code in a separate commit before migration, per the tests-first rule.
5. **Legacy-location tests may be unit-style.** Where a `*Controller.test.ts` file calls controller functions directly and doesn't exercise the middleware chain, the rewrite step has to add HTTP-layer coverage — not just rename. Per-controller audit catches this.

## Verification gates

Between each `test(server): ...` commit and its matching `refactor(server): migrate ...` commit:

```bash
yarn nx test server -- <base>
```

Must pass. Then after migration:

```bash
yarn nx test server -- <base>
yarn nx test server                   # full suite, at major phase boundaries
yarn nx typecheck server
yarn nx lint server
```

At the end of the PR:

```bash
yarn nx test server
yarn nx test packages-schemas
yarn nx typecheck server packages-schemas
grep -r "express-validator" server/src packages/schemas/src   # must return nothing
```
