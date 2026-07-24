# Kysely Migration — Phase 3: establishmentRepository Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `establishmentRepository`'s `find`/`get`/`findOne`/`update`/`setAvailable`/`save`/`stream` from Knex to Kysely, verified green against the Phase 2 characterization tests and every direct caller's test suite.

**Architecture:** Keep `establishmentsTable`/`Establishments()` (Knex accessor), `EstablishmentDBO`, and `formatEstablishmentApi`/`parseEstablishmentApi` (legacy snake_case pair, directly unit-tested) unchanged — seeds and many other repos' tests insert via `Establishments().insert(formatEstablishmentApi(...))`. Added a new internal `parseEstablishmentRow` for the Kysely-camelCase-row path (mirrors the `localityRepository`/`datafoncierHousingRepository` pattern of keeping a legacy DBO parser alongside a new Kysely row parser, rather than reusing one for both shapes).

Notable translations from the original Knex query:

1. **The `users` include** was a `LEFT JOIN LATERAL (...) u ON true` in Knex. Rather than fight Kysely's lack of a first-class lateral-join API, this migrates to a **correlated scalar subquery in the SELECT list** (`eb.selectFrom('users').select(sql\`coalesce(json_agg(users.\*), '[]'::json)\`.as('users')).whereRef(...).as('users')`) — semantically identical for this single-aggregate-column use case, and it's the Kysely-idiomatic way to attach a related collection without a real join.
2. **All raw-SQL filters kept as `sql` template fragments** (`query`, `related`, `geoCodes`, `name`) — Kysely has no query-builder API for `unaccent`/`regexp_replace`/the `&&` array-overlap operator, so these are unavoidable. `sql\`...${jsValue}...\``binds`jsValue` as a parameter (safe), not string-interpolated.
3. **`sql.val(filters.geoCodes)` for the array-overlap parameter** — a plain `${filters.geoCodes}` interpolation also works (node-postgres serializes JS arrays as Postgres array literals when bound), but `sql.val()` makes the "this is a bound value, not a raw fragment" intent explicit.
4. **`siren` filter now converts to numbers explicitly** (`filters.siren.map(Number)`) — the original Knex `.whereIn('siren', filters.siren)` passed strings directly against the integer `siren` column and relied on Postgres's implicit parameter-type inference; Kysely's stricter typing surfaces this mismatch at compile time, so the conversion is now explicit rather than implicit.
5. **`stream()` migrated via `ReadableStream.from(asyncGenerator)`** wrapping Kysely's `.stream()` (an async iterable, backed by the shared instance's `pg-cursor` dialect option) — replaces `Readable.toWeb(knexStream.map(...))`. `stream()` has zero callers anywhere (see Phase 2 plan) but was migrated rather than deleted since it mirrors the actively-used `housingRepository.stream`/`ownerRepository.stream` pattern.
6. **`update()`/`save()` convert the legacy snake_case DBO to camelCase** via `Record.mapKeys(dbo, snakeToCamel)` (the reverse direction of the `camelToSnake` conversion used in the datafoncier repos) before handing it to Kysely, since `update()`/`save()`'s public signatures stay coupled to `EstablishmentApi`/`EstablishmentDBO` for backward compatibility.

**Tech Stack:** TypeScript, Kysely (`~/infra/database/kysely`), `effect`/`effect/String` (`Record.mapKeys`, `snakeToCamel`), Knex (kept only for the `Establishments()` test/seed accessor), Vitest (real Postgres integration tests), Web Streams API (`ReadableStream.from`).

## Global Constraints

- **Verification, not characterization, this phase:** the 32 Phase 2 tests must pass UNCHANGED against the migrated code.
- **Do not change:** `establishmentsTable`, `Establishments()`, `EstablishmentDBO`, `formatEstablishmentApi`, `parseEstablishmentApi` — all still consumed externally by seeds/tests via the Knex accessor, and `parseEstablishmentApi` is directly unit-tested against the snake_case shape.
- **`Record.mapKeys` needs a plain-Record cast** — `EstablishmentDBO` is a declared interface, not a type literal/mapped type, so TypeScript won't structurally accept it as `ReadonlyRecord<string, ...>` without an explicit `as unknown as Record<string, unknown>` cast first.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) Phase 2 tests green; (4) every direct caller's test suite green (`establishment-api`, `auth-controller`, `auth-integration`, `session` middleware, `auth-admin-two-factor`, `establishmentAuthService`, `user-api`, `housing-api`, `locality-api`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Migrate to Kysely

**Files:**

- Modify: `server/src/repositories/establishmentRepository.ts`

- [x] **Step 1: Replace the file contents** with the Kysely-based `listQuery`/`find`/`get`/`findOne`/`update`/`setAvailable`/`save`/`stream`/`parseEstablishmentRow`, applying the six translations above.
- [x] **Step 2: Run the characterization tests**

Run: `yarn nx test server -- run src/repositories/test/establishmentRepository.test.ts`
Result: 32/32 pass on the first attempt.

- [x] **Step 3: Run every direct caller's test suite**

Run: `yarn nx test server -- run src/controllers/test/establishment-api.test.ts src/controllers/test/auth-controller.test.ts src/controllers/test/auth-integration.test.ts src/middlewares/test/session.test.ts src/infra/test/auth-admin-two-factor.test.ts src/services/test/establishmentAuthService.test.ts src/controllers/test/user-api.test.ts src/controllers/test/housing-api.test.ts src/controllers/test/locality-api.test.ts`
Result: 9 files, 173 pass + 2 pre-existing todo.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors, after adding `as unknown as Record<string, unknown>` casts for the two `Record.mapKeys` call sites), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/establishmentRepository.ts
git commit -m "feat(server): migrate establishmentRepository to Kysely"
```
