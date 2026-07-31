# Kysely Migration — Phase 2: campaignHousingRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `campaignHousingRepository` branch coverage from 66.7% to ≥85% (→100% reachable) with characterization tests, before the file's Kysely migration.

**Architecture:** Add tests only to `server/src/repositories/test/campaignHousingRepository.test.ts` (no production code). The gaps: the entirely-uncovered `insertHousingList` (transaction + `onConflict().ignore()`), `removeMany`'s empty-list early-return, and the pure `formatCampaignHousingApi`.

**Tech Stack:** TypeScript, Knex, Vitest (real Postgres integration tests), fishery factories, `~/test/testFixtures` generators.

## Global Constraints

- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `campaignHousingRepository.ts` or any production file. If a test reveals a latent bug, assert ACTUAL behavior and report DONE_WITH_CONCERNS.
- **Framework:** Vitest only. Real Postgres (already running). Run tests via `yarn nx test server -- run <path>` from repo root.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` (canonical root oxlint script; NOT `yarn oxlint` directly) → 0 warnings on the modified file. Remove any unused import. Use only valid enum/union literals.
- **Assertions:** verify with primitive table accessors (`CampaignsHousing()`), never via the repository under test. `insertHousingList` and `formatCampaignHousingApi` are only reachable via the default export object (`campaignHousingRepository.insertHousingList`, `.formatCampaignHousingApi` — confirm whether `formatCampaignHousingApi` is also a named export; use whichever the source provides).
- **Fixtures:** mirror the existing test file — establishment+user in `beforeAll`; campaigns via `factories.campaign(establishment).create({}, { associations: { createdBy: user } })`; housing via `Housing().insert(housings.map(formatHousingRecordApi))`.
- **Commit messages:** English; scope `test(server)`.
- **Phase-3 finding to document, not fix:** `removeMany`'s guard is `housings?.length === 0`, so passing `null`/`undefined` (instead of `[]`) falls through and crashes in the `.map`. Do NOT test with `null` and do NOT fix the guard — just record the finding.
- **Convention note (Phase 3):** `insertHousingList`/`removeMany` call `withinTransaction` inside the repository (legacy pattern; backend-conventions says transactions belong in controllers). Characterize as-is; refactor is separate.
- **Method:** open `campaignHousingRepository.ts` (functions under test) and `campaignHousingRepository.test.ts` (existing sibling test) and mirror the closest existing test. Read the EXACT signatures (`insertHousingList(campaign?, housings?)` vs `(campaignId, housings)`; `removeMany(campaign, housings)`; `formatCampaignHousingApi(campaign, housings)`) before writing.

## Baseline (measured 2026-07-08, scoped)

Statements 60%, **Branches 66.7% (2/3)**, Functions 44.4%.

---

## File Structure

- **Modify (tests only):** `server/src/repositories/test/campaignHousingRepository.test.ts`.

---

## Task 1: Cover insertHousingList, removeMany empty-guard, and formatCampaignHousingApi

**Files:** Modify `server/src/repositories/test/campaignHousingRepository.test.ts`

**Interfaces:** `campaignHousingRepository.insertHousingList`, `campaignHousingRepository.removeMany`, `formatCampaignHousingApi` (via default export or named — confirm); accessors `CampaignsHousing`, `Housing`; `factories.campaign`; generators `genHousingApi`. Read each function's exact signature and the `CampaignsHousing` DBO columns (`campaign_id`, `housing_id`, `housing_geo_code`).

- [ ] **Step 1: Write the tests**:
  1. `insertHousingList` basic — seed a campaign + N housing rows; call `insertHousingList(<campaign per signature>, housings)`; assert `CampaignsHousing().where({ campaign_id })` has one row per housing with correct `housing_id`/`housing_geo_code` (covers the transaction body + mapper).
  2. `insertHousingList` dedup — call it twice with the same housings; assert the row count equals N (not 2N), exercising `.onConflict([...]).ignore()`.
  3. `removeMany` empty list — call `removeMany(campaign, [])`; assert it resolves and the `CampaignsHousing()` count is unchanged (branch: `housings.length === 0` early return). Use a before/after count.
  4. `removeMany` present-check — insert rows (via `insertHousingList` or `CampaignsHousing().insert`), call `removeMany(campaign, [subset])`, assert the subset rows are gone and the others remain.
  5. `formatCampaignHousingApi` basic — call with a campaign + housings; assert each element maps `housing.id → housing_id`, `housing.geoCode → housing_geo_code`, `campaign.id → campaign_id`. Pure, no DB.
  6. `formatCampaignHousingApi` empty — call with `[]`; assert `[]`.

- [ ] **Step 2: Run — expect PASS.** `yarn nx test server -- run src/repositories/test/campaignHousingRepository.test.ts`
- [ ] **Step 3: Gates.** `yarn nx typecheck server` → 0 errors; `yarn lint` → 0 warnings on the modified file.
- [ ] **Step 4: Commit.** `git commit -m "test(server): cover campaignHousingRepository insert, remove, and format"`

---

## Task 2: Verify coverage target reached

**Files:** none (measurement + DoD gate).

- [ ] **Step 1: Measure.**

```
yarn nx test server -- run --coverage --coverage.provider=v8 --coverage.reporter=json-summary --coverage.include='src/repositories/campaignHousingRepository.ts' src/repositories/test/campaignHousingRepository.test.ts
```

Read `server/coverage/coverage-summary.json` for `campaignHousingRepository.ts` branch %. Expected **≥ 85%** (from 66.7%).

- [ ] **Step 2: If below 85%** — read remaining uncovered lines, add the missing case(s) (no production change), re-run. Commit as `test(server): close remaining campaignHousingRepository coverage gaps`.

- [ ] **Step 3: Confirm no regressions.** `yarn nx test server -- run src/repositories/test/campaignHousingRepository.test.ts` → all green.

---

## Definition of Done

- `campaignHousingRepository.ts` branch coverage ≥ 85%; all tests green; typecheck + lint clean.
- No production code changed; the `removeMany(null)` crash and the in-repository `withinTransaction` convention issue documented for Phase 3.
- **Review checkpoint** — this is the last Phase-2 target; report the full Phase-2 summary.
