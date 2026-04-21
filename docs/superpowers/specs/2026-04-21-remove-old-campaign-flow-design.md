# Remove Old Campaign Flow — Design Spec

**Date:** 2026-04-21  
**Scope:** Full-stack + CI  
**Strategy:** Single atomic PR (Option A)

## Context

The old campaign flow used a BullMQ queue worker to asynchronously generate PDF mail letters via Puppeteer and upload them to S3. This flow has been replaced by a synchronous approach: the frontend calls the backend directly, PDF generation is handled by `packages/pdf`, and no queue or SSE is needed. The new UI was shipped behind a `new-campaigns` feature flag and is now in production.

## Packages to Delete Entirely

| Package | Why |
|---|---|
| `queue/` | BullMQ worker with single job `campaign-generate` — fully superseded |
| `packages/api-sdk/` | HTTP+DB client used exclusively by the queue worker |
| `packages/draft/` | Puppeteer-based PDF generation — superseded by `packages/pdf` |

## Server Changes (`server/`)

- Delete `src/infra/queue.ts`
- Delete `src/controllers/serverSentEventController.ts` and its route registration
- Remove `generateMails()` from `src/repositories/campaignRepository.ts`
- Remove the `generateMails()` call from `src/controllers/campaignController.ts` (triggered on `status === 'sending'`)
- Remove `@zerologementvacant/queue`, `@zerologementvacant/api-sdk`, `@zerologementvacant/draft` from `server/package.json`
- Audit `src/controllers/draftController.ts` — if it still imports from `packages/draft`, update or remove as needed

## Frontend Changes (`frontend/`)

### Old views to delete

- `CampaignView` (non-Next)
- `CampaignListView` (non-Next)
- `GroupView` (non-Next)
- `HousingListView` (non-Next)
- All co-located tests for the above

### `*Next` files to rename (drop the `Next` suffix)

| From | To |
|---|---|
| `CampaignViewNext` | `CampaignView` |
| `CampaignListViewNext` | `CampaignListView` |
| `GroupViewNext` | `GroupView` |
| `HousingListViewNext` | `HousingListView` |

Update all internal imports after rename.

### `App.tsx` cleanup

- Replace each `FeatureFlagLayout flag="new-campaigns"` wrapper with a direct reference to the (now renamed) component
- Remove unused imports (`CampaignView` old, `CampaignListView` old, `GroupView` old, `HousingListView` old, `FeatureFlagLayout` if no other flag uses it)

### Other frontend cleanup

- Remove SSE listener for `campaign-generate` from `CampaignSending.tsx` (or delete the file if it belongs to the old flow entirely)
- Remove `@zerologementvacant/queue` from `frontend/package.json`
- Check `FeatureFlagLayout` — delete if `new-campaigns` was its only usage

## CI Changes

### `.github/workflows/main.yml`
- Remove `queue/**` from `paths` trigger
- Remove `redis` service (only used by queue)
- Remove `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: true` from Install step
- Remove `deploy-queue-staging` job

### `.github/workflows/pull-request.yml`
- Remove `queue/**` from `paths` trigger
- Remove `redis` service
- Remove `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: true` from Install step

### `.github/workflows/review-app.yml`
- Remove `deploy-queue` job (create action)
- Remove `update-queue` job (update action)
- Remove `delete-queue` job (delete/close action)
- Remove `clever addon create redis-addon` from `deploy-addons` job
- Remove `clever addon delete $PR_NAME-redis` from `delete-addons` job
- Remove `clever service link-addon $PR_NAME-redis` from `deploy-api` job
- Remove `CC_OVERRIDE_BUILDCACHE` with puppeteer path from `deploy-api` env vars

## Root / Workspace Cleanup

- Remove `queue` from `workspaces` in root `package.json`
- Remove `puppeteer` `dependenciesMeta` entry from root `package.json`
- Run `yarn` to update `yarn.lock`

## Out of Scope

- Campaign business logic (routes, controllers, repositories for campaigns themselves) — campaigns remain a core feature
- Database tables (`campaigns`, `campaign_housings`, `drafts`, etc.) — not touched
- `packages/pdf` — the new PDF package, not modified
