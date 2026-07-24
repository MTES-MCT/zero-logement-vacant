# Kysely Migration — campaignRepository Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove `insert`/`update`, the last two Knex functions in `campaignRepository.ts` — confirmed dead, and already fully superseded by the existing Kysely `save()` (an atomic upsert).

**Architecture:** `save()` (already Kysely, `withinKyselyTransaction` + `onConflict().doUpdateSet()`) already covers both the insert-new and update-existing cases in one call — exactly the shape `betterSave` took over from `save`/`saveMany` in `ownerRepository` earlier in this effort. Confirmed via repo-wide `grep` that `campaignRepository.insert` and `campaignRepository.update` have zero production callers, and via the test file that neither is exercised there either (all `.insert(`/`.update(` hits in the test file are unrelated raw-table fixture setup, e.g. `Campaigns().update(...)`, `Owners().insert(...)`).

`parseCampaignApi` (the snake_case `CampaignDBO` → `CampaignApi` converter used only by the removed `insert`/`update`) became entirely dead as a result — no callers anywhere, not even tests — so it's removed too. `formatCampaignApi` and `CampaignDBO` stay: `formatCampaignApi` is still imported by a seed file, `test/factories/knex-adapter.ts`, and `housingExport-api.test.ts`.

**Tech Stack:** TypeScript, Kysely.

## Global Constraints

- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) full `campaignRepository.test.ts` suite green; (4) direct-caller controller suites green (`campaign-api`, `group-api`, `housingExport-api`, `draft-api`).
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Remove insert/update/parseCampaignApi

**Files:**

- Modify: `server/src/repositories/campaignRepository.ts`

- [x] **Step 1: Remove `insert`, `update`, `parseCampaignApi`** and their entries from the default export.
- [x] **Step 2: Mandatory gates**

Run: `yarn nx typecheck server` — 0 errors (pre-existing `@deprecated` field notices unrelated to this change).
Run: `yarn lint` — 0 warnings.
Run: `yarn nx test server -- run src/repositories/test/campaignRepository.test.ts` — 36/36 pass.
Run: `yarn nx test server -- run src/controllers/test/campaign-api.test.ts src/controllers/test/group-api.test.ts src/controllers/test/housingExport-api.test.ts src/controllers/test/draft-api.test.ts` — 4 files, 100/100 pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/campaignRepository.ts
git commit -m "feat(server): remove dead insert/update from campaignRepository"
```
