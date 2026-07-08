# Kysely Migration — Phase 2: eventRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `eventRepository` branch coverage from 60% to ≥85% with characterization tests that pin down current Knex behavior, so the later Kysely migration of this file can be verified by a green suite.

**Architecture:** Add tests only to `server/src/repositories/test/eventRepository.test.ts` (and no production code). Mirror the existing test file's patterns exactly. Tests document CURRENT behavior and must pass on the current code.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), fishery factories, `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against the current code. Do NOT modify `eventRepository.ts` or any production file. If a test reveals a latent bug, keep the test asserting the actual current behavior and report it as DONE_WITH_CONCERNS — do not "fix" the behavior in this phase.
- **Framework:** Vitest only, never Jest. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **Assertions:** verify persistence with primitive table accessors (`Events()`, `HousingOwnerEvents()`, …), never via the repository under test. Follow the existing file's style: `expect(actual.length).toBe(n)`, `toSatisfyAll`, `toBeArrayOfSize(0)`.
- **Fixtures:** use the existing generators (`genEventApi`, `genHousingApi`, `genOwnerApi`, `genGroupApi`, `genPrecisionApi`, …) from `~/test/testFixtures` and fishery `factories` (e.g. `factories.campaign(establishment).create(...)`). Do not invent new fixture helpers.
- **Commit messages:** English; scope `test(server)`.
- **Known latent bug to document, not fix (Task 4):** `insertManyPrecisionHousingEvents` (eventRepository.ts:~116) uses `db.transaction()` directly instead of `withinTransaction()`. The characterization test only asserts rows are written; it must NOT assert transaction participation and must NOT change the code.
- **Method of writing each test:** open `eventRepository.ts` (the function under test) and `eventRepository.test.ts` (the nearest already-covered sibling), and mirror the closest existing test — same imports, seeding, and assertion accessors — substituting the target event type. The "closest sibling" for every `insertMany*` non-empty test is the existing `describe('insertManyHousingEvents')` block.

## Baseline (measured 2026-07-08)

`eventRepository.ts`: Statements 70.76%, **Branches 60% (30/50)**, Functions 80.7%, Lines 70.76%.
Measured with:
`yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=text --coverage.include='src/repositories/eventRepository.ts' src/repositories/test/eventRepository.test.ts`

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/eventRepository.test.ts` — add the missing `describe`/`it` blocks. One added block per function, matching the existing "one describe per exported function" structure.

---

## Task 1: Pure format/parse unit tests (no DB)

Covers 5 pure-function branch arms. No seeding, no DB writes — these call the exported format/parse functions directly and assert the returned object.

**Files:**
- Modify: `server/src/repositories/test/eventRepository.test.ts`

**Interfaces (import the named exports from `~/repositories/eventRepository`):**
`parseEventApi`, `formatPrecisionHousingEventApi`, `formatHousingOwnerEventApi`, `formatPerimeterHousingEventApi`, `formatGroupHousingEventApi`. Read each function's signature in `eventRepository.ts` before writing — build inputs with the existing `genEventApi(...)` generator plus the specific link field, so the DBO field names in your assertions match the code.

- [ ] **Step 1: Write the tests**

Add a `describe('format/parse edge cases', …)` block (or extend the existing per-function describes) with one `it` per scenario below. Each asserts the branch named:

1. `parseEventApi` with `creator` absent/undefined → returned object has `creator: undefined` (covers eventRepository.ts:412 conditional false arm). Build a raw joined-row input like the existing `find` tests produce, but with no user columns / `creator` falsy.
2. `formatPrecisionHousingEventApi({ …, precisionId: undefined })` → `precision_id === null` (line 444 `?? null` null arm).
3. `formatHousingOwnerEventApi({ …, ownerId: undefined })` → `owner_id === null` (line 462).
4. `formatPerimeterHousingEventApi(...)` twice — once with a defined `perimeterId` (assert it propagates to `perimeter_id`) and once with `perimeterId: undefined` (assert `perimeter_id === null`) — covers both arms at lines 476–481. NOTE: this function is exported but is NOT in the `export default` object; import it as a named export.
5. `formatGroupHousingEventApi({ …, groupId: undefined })` → `group_id === null` (line 498).

- [ ] **Step 2: Run the tests — expect PASS (characterization)**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts -t "format"`
Expected: PASS. (These pin current behavior; they are not red-first.)

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/eventRepository.test.ts
git commit -m "test(server): cover eventRepository format/parse null branches"
```

---

## Task 2: Empty-array guards for all 9 `insertMany*` functions (no seeding)

Each `insertMany*` function early-returns on an empty array. Calling it with `[]` covers that guard arm. No seeding needed — just assert the target table gained no rows.

**Files:**
- Modify: `server/src/repositories/test/eventRepository.test.ts`

**Interfaces:** default `eventRepository`; table accessors `Events`, `HousingEvents`, `HousingOwnerEvents`, `PrecisionHousingEvents`, `OwnerEvents`, `CampaignHousingEvents`, `CampaignEvents`, `GroupHousingEvents`, `DocumentEvents`, `HousingDocumentEvents` (named exports from `~/repositories/eventRepository`).

- [ ] **Step 1: Write the tests**

For each function below, add an `it('does not write when given an empty array', …)` to its `describe` (create the `describe` if the function has none). Each test: capture the target table's row count (or assert `toBeArrayOfSize(0)` on a scoped query), call the function with `[]`, assert no new rows:

- `insertManyHousingEvents([])` → `HousingEvents()` unchanged (line 66 guard)
- `insertManyHousingOwnerEvents([])` → `HousingOwnerEvents()` unchanged (line 87)
- `insertManyPrecisionHousingEvents([])` → `PrecisionHousingEvents()` unchanged (line 109)
- `insertManyOwnerEvents([])` → `OwnerEvents()` unchanged (line 128)
- `insertManyCampaignHousingEvents([])` → `CampaignHousingEvents()` unchanged (line 146)
- `insertManyCampaignEvents([])` → `CampaignEvents()` unchanged (line 165)
- `insertManyGroupHousingEvents([])` → `GroupHousingEvents()` unchanged (line 184)
- `insertManyDocumentEvents([])` → `DocumentEvents()` unchanged (line 203)
- `insertManyHousingDocumentEvents([])` → `HousingDocumentEvents()` unchanged (line 221)

Use a stable assertion that isn't polluted by other tests' rows — prefer asserting the function resolves and a freshly-scoped query (e.g. by a unique `createdBy` user seeded in this block, or by comparing before/after counts within the test).

- [ ] **Step 2: Run the tests — expect PASS**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts -t "empty array"`
Expected: PASS (9 new tests).

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/eventRepository.test.ts
git commit -m "test(server): cover eventRepository insertMany empty-array guards"
```

---

## Task 3: Non-empty paths for insertManyHousingOwnerEvents, insertManyGroupHousingEvents

Two of the five entirely-uncovered `insertMany*` functions. Each needs seeding, then asserts rows land in `Events()` and the link table. Mirror the existing `describe('insertManyHousingEvents')` non-empty test for structure.

**Files:**
- Modify: `server/src/repositories/test/eventRepository.test.ts`

**Interfaces:** `eventRepository.insertManyHousingOwnerEvents`, `eventRepository.insertManyGroupHousingEvents`; accessors `Events`, `HousingOwnerEvents`, `GroupHousingEvents`, `Housing`, `Owners`, `Groups` (use whatever the existing tests use to seed housing/owner/group); generators `genEventApi`, `genHousingApi`, `genOwnerApi`, `genGroupApi`.

- [ ] **Step 1: Write the tests**

Read `eventRepository.ts` for the exact `HousingOwnerEventApi` / `GroupHousingEventApi` shapes (link fields) and mirror the existing `insertManyHousingEvents` non-empty test:

1. `insertManyHousingOwnerEvents` — seed a housing and an owner (as the existing housing/owner tests do), build one event via `genEventApi({ creator, type: <a housing:owner… type>, … })` spread with the housing-owner link fields, call the function, then assert the row exists in both `Events().whereIn('id', ids)` and `HousingOwnerEvents().whereIn('event_id', ids)` (covers lines 91–103).
2. `insertManyGroupHousingEvents` — seed a housing and a group, build one `GroupHousingEventApi`, call the function, assert rows in `Events()` and `GroupHousingEvents()` (covers lines 188–197).

- [ ] **Step 2: Run — expect PASS**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts -t "insertManyHousingOwnerEvents|insertManyGroupHousingEvents"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/eventRepository.test.ts
git commit -m "test(server): cover eventRepository housing-owner and group-housing inserts"
```

---

## Task 4: Non-empty paths for the campaign + precision insertMany functions

The remaining three uncovered `insertMany*` functions. Campaign-housing and campaign events share campaign seeding; precision-housing carries the latent-bug flag.

**Files:**
- Modify: `server/src/repositories/test/eventRepository.test.ts`

**Interfaces:** `eventRepository.insertManyCampaignHousingEvents`, `eventRepository.insertManyCampaignEvents`, `eventRepository.insertManyPrecisionHousingEvents`; accessors `Events`, `CampaignHousingEvents`, `CampaignEvents`, `PrecisionHousingEvents`, `Housing`, precision referential `Precisions`; fishery `factories.campaign(establishment)`; generators `genEventApi`, `genHousingApi`.

- [ ] **Step 1: Write the tests**

Read the three functions' event-API shapes in `eventRepository.ts`; seed with `factories.campaign(establishment).create(...)` for campaign rows (as existing campaign-touching tests do) and a real seeded precision from `Precisions()`:

1. `insertManyCampaignHousingEvents` — seed housing + campaign, build one event, assert rows in `Events()` and `CampaignHousingEvents()` (lines 150–159).
2. `insertManyCampaignEvents` — seed campaign, build one event, assert rows in `Events()` and `CampaignEvents()` (lines 169–178).
3. `insertManyPrecisionHousingEvents` — seed housing + pick a precision from `Precisions()`, build one event, assert rows in `Events()` and `PrecisionHousingEvents()` (lines 113–122). **Assert only that the rows are written (current behavior). Do NOT assert transaction participation and do NOT modify `eventRepository.ts`** — this function uses `db.transaction()` directly (latent bug); report it under concerns.

- [ ] **Step 2: Run — expect PASS**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts -t "insertManyCampaign|insertManyPrecisionHousingEvents"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/eventRepository.test.ts
git commit -m "test(server): cover eventRepository campaign and precision inserts"
```

- [ ] **Step 4: Report the latent bug**

In your report's concerns, record: `insertManyPrecisionHousingEvents` uses `db.transaction()` directly instead of `withinTransaction()`, so it will not join an ambient transaction — to be addressed when eventRepository is migrated (Phase 3), not here.

---

## Task 5: Verify coverage target reached

**Files:** none (measurement + DoD gate).

- [ ] **Step 1: Measure eventRepository coverage**

Run:
```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=text --coverage.include='src/repositories/eventRepository.ts' src/repositories/test/eventRepository.test.ts
```
Expected: `eventRepository.ts` **Branch ≥ 85%** (up from 60%), all eventRepository tests green.

- [ ] **Step 2: If below 85%**

Read the remaining "Uncovered Line #s" for `eventRepository.ts` and add the missing case(s) by the same mirroring method, then re-run. Do not modify production code. Commit any additions with `test(server): close remaining eventRepository coverage gaps`.

- [ ] **Step 3: Confirm no regressions in the repository suite**

Run: `yarn nx test server -- run src/repositories/test/eventRepository.test.ts`
Expected: all green, output pristine.

---

## Definition of Done

- `eventRepository.ts` branch coverage ≥ 85%; all eventRepository tests green.
- No production code changed; the latent `insertManyPrecisionHousingEvents` transaction bug is documented for Phase 3, not fixed.
- **Review checkpoint** — stop for review before the next Phase-2 repo (`ownerRepository`).
