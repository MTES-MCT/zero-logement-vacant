# Campaign Send-Date Postpone Revert — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a campaign's `sentAt` is changed to a date strictly later than today, revert the housings the send-date rule auto-flipped (`WAITING` → `NEVER_CONTACTED`) with a system-attributed event, and backfill old human-attributed auto-flip events to the system account so they too become revertible.

**Architecture:** A new `revertCampaignHousingsToNeverContacted` service (sibling of the existing `flipCampaignHousingsToWaiting`) is called from `campaignController.update` on postponement. Eligibility is "only our untouched auto-flip": no sibling campaign has genuinely sent, and the housing's latest `housing:status-updated` event is the pristine `Non suivi → En attente de retour` flip authored by the system account. A second branch is added to the existing `campaign-sending-date` repair to re-author old human-attributed auto-flips (delete-old + create-replacement with a **new id**, same `createdAt`).

**Tech Stack:** TypeScript, Express, Knex, PostgreSQL, Vitest, `@fast-check/vitest`, effect.

## Global Constraints

- **Status labels are French strings, not enum numbers.** `HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]` → `'Non suivi'`, `HOUSING_STATUS_LABELS[HousingStatus.WAITING]` → `'En attente de retour'`. `HousingStatus.NEVER_CONTACTED = 0`, `HousingStatus.WAITING = 1`.
- **Backend order:** router → controller test → controller → repository test → repository. Tests before implementation (TDD).
- **Commit scopes are workspace-level:** `feat(server)`, `refactor(server)`, `test(server)` — never subdirectory names.
- **Lint/format/typecheck gates:** `yarn nx typecheck server` and `yarn lint` (oxlint) must pass — Vitest does neither. Format with `yarn format:fix` (oxfmt), never eslint/prettier.
- **Run tests via nx:** `yarn nx test server -- <pattern>`.
- **System-account resolution stays outside the transaction** in the controller (`resolveSystemUser` returns `null`, never throws): a missing system account must defer the flip/revert, never roll back the campaign's own metadata save.
- **Event `createdAt` on the re-authored replacement is preserved** (only `id` and `createdBy` change).

---

### Task 1: `isSendDateInFuture` helper

**Files:**
- Modify: `server/src/models/CampaignApi.ts` (append next to `isSendDateReached`, ~line 102)
- Test: `server/src/models/test/CampaignApi.test.ts`

**Interfaces:**
- Produces: `isSendDateInFuture(sentAt: CampaignApi['sentAt'], today: string): boolean` — the exact complement of `isSendDateReached` for a **non-null** date.

- [ ] **Step 1: Write the failing test**

Append to `server/src/models/test/CampaignApi.test.ts` (add `isSendDateInFuture` to the existing import from `~/models/CampaignApi`):

```typescript
describe('isSendDateInFuture', () => {
  const today = '2026-07-23';

  it('returns false when sentAt is null', () => {
    expect(isSendDateInFuture(null, today)).toBe(false);
  });

  it('returns false when sentAt is today', () => {
    expect(isSendDateInFuture('2026-07-23', today)).toBe(false);
  });

  it('returns false when sentAt is in the past', () => {
    expect(isSendDateInFuture('2020-01-01', today)).toBe(false);
  });

  it('returns true when sentAt is strictly after today', () => {
    expect(isSendDateInFuture('2999-01-01', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateInFuture('2999-01-01T23:59:59.000Z', today)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test server -- CampaignApi.test`
Expected: FAIL — `isSendDateInFuture is not a function` / import error.

- [ ] **Step 3: Write minimal implementation**

Append to `server/src/models/CampaignApi.ts` after `isSendDateReached`:

```typescript
/**
 * Whether a campaign's sending date is still in the future: `sentAt` is set and
 * strictly after `today` (compared as `yyyy-MM-dd` strings). The exact
 * complement of {@link isSendDateReached} for a non-null date — note it is NOT
 * `!isSendDateReached(...)`, which is also true for `null`.
 */
export function isSendDateInFuture(
  sentAt: CampaignApi['sentAt'],
  today: string
): boolean {
  return sentAt !== null && sentAt.slice(0, 10) > today;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test server -- CampaignApi.test`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
yarn nx typecheck server && yarn lint
git add server/src/models/CampaignApi.ts server/src/models/test/CampaignApi.test.ts
git commit -m "feat(server): add isSendDateInFuture campaign helper"
```

---

### Task 2: Rename service file to kebab-case

Pure rename + import updates, no behavior change. Isolated so a reviewer can verify green tests before new logic lands.

**Files:**
- Rename: `server/src/services/campaignHousingService.ts` → `server/src/services/campaign-housing-service.ts`
- Rename: `server/src/services/test/campaignHousingService.test.ts` → `server/src/services/test/campaign-housing-service.test.ts`
- Modify: `server/src/controllers/campaignController.ts:44` (import path)
- Modify: `server/src/scripts/flip-sent-campaign-housings/task.ts` (import path)
- Modify: the renamed test file's own import path

**Interfaces:**
- Produces: module `~/services/campaign-housing-service` exporting the unchanged `resolveSystemUser`, `flipHousingsToWaiting`, `flipCampaignHousingsToWaiting`.

- [ ] **Step 1: Rename both files with git**

```bash
git mv server/src/services/campaignHousingService.ts server/src/services/campaign-housing-service.ts
git mv server/src/services/test/campaignHousingService.test.ts server/src/services/test/campaign-housing-service.test.ts
```

- [ ] **Step 2: Update every importer**

In `server/src/controllers/campaignController.ts`, `server/src/scripts/flip-sent-campaign-housings/task.ts`, and `server/src/services/test/campaign-housing-service.test.ts`, replace the string `~/services/campaignHousingService` with `~/services/campaign-housing-service`. Also update the top `describe('campaignHousingService', ...)` label in the renamed test to `describe('campaign-housing-service', ...)`.

Verify none remain:

Run: `grep -rn "campaignHousingService" server/src`
Expected: no output.

- [ ] **Step 3: Run the service tests + typecheck to prove the rename is clean**

Run: `yarn nx test server -- campaign-housing-service.test && yarn nx typecheck server`
Expected: PASS (same tests as before, new filename).

- [ ] **Step 4: Commit**

```bash
yarn lint
git add -A server/src/services server/src/controllers/campaignController.ts server/src/scripts/flip-sent-campaign-housings/task.ts
git commit -m "refactor(server): rename campaignHousingService to kebab-case"
```

---

### Task 3: `revertCampaignHousingsToNeverContacted` service

**Files:**
- Modify: `server/src/services/campaign-housing-service.ts` (add function + private enrichment helper + imports)
- Test: `server/src/services/test/campaign-housing-service.test.ts` (new `describe` block)

**Interfaces:**
- Consumes: `isSendDateReached` from `~/models/CampaignApi`; `withinTransaction` from `~/infra/database/transaction`; `Campaigns` from `~/repositories/campaignRepository`; `EVENTS_TABLE`, `HOUSING_EVENTS_TABLE`, `HousingEvents` from `~/repositories/eventRepository`; `housingRepository.find/updateMany`, `eventRepository.insertManyHousingEvents` (already imported); `chunksOf` from `effect/Array`.
- Produces: `revertCampaignHousingsToNeverContacted(campaign: Pick<CampaignApi, 'id'>, system: UserApi, today: string): Promise<number>` — returns the number of housings actually reverted.

- [ ] **Step 1: Write the failing tests**

Add these imports to the top of `server/src/services/test/campaign-housing-service.test.ts` (extend the existing `eventRepository` import to include `HousingEvents` and `formatEventApi`; add `genEventApi` to the testFixtures import; add `HOUSING_STATUS_LABELS` to the models import):

```typescript
import { HOUSING_STATUS_LABELS, HousingStatus } from '@zerologementvacant/models';
// eventRepository import becomes:
import {
  Events,
  formatEventApi,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
// testFixtures import gains genEventApi:
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
// service import gains the new function:
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting,
  revertCampaignHousingsToNeverContacted
} from '~/services/campaign-housing-service';
```

Add a new `describe` block inside the top-level `describe('campaign-housing-service', ...)`:

```typescript
describe('revertCampaignHousingsToNeverContacted', () => {
  const TODAY = '2026-07-15';

  // Attach `housing` to `campaign`, mark it WAITING, and give it a pristine
  // auto-flip status event authored by `author` (defaults to the system).
  async function setupWaitingHousing(
    campaign: ReturnType<typeof genCampaignApi>,
    author: UserApi = system,
    flipOverrides: Partial<{
      nextOld: { status: string };
      nextNew: { status: string };
    }> = {}
  ) {
    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });
    const flip = genEventApi({
      type: 'housing:status-updated',
      creator: author,
      nextOld: {
        status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
      },
      nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
      ...flipOverrides
    });
    await Events().insert(formatEventApi(flip));
    await HousingEvents().insert({
      event_id: flip.id,
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    return housing;
  }

  async function statusOf(housing: { geoCode: string; id: string }) {
    const row = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    return row?.status;
  }

  async function revertEventsFor(housing: { geoCode: string; id: string }) {
    return Events()
      .where({ type: 'housing:status-updated' })
      .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
      .where({ housing_geo_code: housing.geoCode, housing_id: housing.id })
      .andWhere('created_by', system.id)
      .andWhereRaw(`next_new ->> 'status' = ?`, [
        HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
      ]);
  }

  it('reverts a pristine system-flipped housing and writes one reverse event', async () => {
    const campaign = genCampaignApi(establishment.id, user);
    await Campaigns().insert(formatCampaignApi(campaign));
    const housing = await setupWaitingHousing(campaign);

    const count = await startTransaction(() =>
      revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
    );

    expect(count).toBe(1);
    expect(await statusOf(housing)).toBe(HousingStatus.NEVER_CONTACTED);
    expect(await revertEventsFor(housing)).toHaveLength(1);
  });

  it('skips when a sibling campaign has genuinely sent', async () => {
    const campaign = genCampaignApi(establishment.id, user);
    const sentSibling = {
      ...genCampaignApi(establishment.id, user),
      sentAt: '2020-01-01'
    };
    await Campaigns().insert(
      [campaign, sentSibling].map(formatCampaignApi)
    );
    const housing = await setupWaitingHousing(campaign);
    // Also attach the housing to the already-sent sibling.
    await CampaignsHousing().insert({
      campaign_id: sentSibling.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const count = await startTransaction(() =>
      revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
    );

    expect(count).toBe(0);
    expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
  });

  it('skips when the latest status event is not the pristine flip shape', async () => {
    const campaign = genCampaignApi(establishment.id, user);
    await Campaigns().insert(formatCampaignApi(campaign));
    const housing = await setupWaitingHousing(campaign, system, {
      nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
      nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.IN_PROGRESS] }
    });

    const count = await startTransaction(() =>
      revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
    );

    expect(count).toBe(0);
    expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
  });

  it('skips when the pristine flip was authored by a user, not the system', async () => {
    const campaign = genCampaignApi(establishment.id, user);
    await Campaigns().insert(formatCampaignApi(campaign));
    const housing = await setupWaitingHousing(campaign, user);

    const count = await startTransaction(() =>
      revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
    );

    expect(count).toBe(0);
    expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
  });

  it('skips a WAITING housing with no status-updated event', async () => {
    const campaign = genCampaignApi(establishment.id, user);
    await Campaigns().insert(formatCampaignApi(campaign));
    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const count = await startTransaction(() =>
      revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
    );

    expect(count).toBe(0);
    expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn nx test server -- campaign-housing-service.test`
Expected: FAIL — `revertCampaignHousingsToNeverContacted is not exported`.

- [ ] **Step 3: Implement the service**

In `server/src/services/campaign-housing-service.ts`, add imports at the top:

```typescript
import { chunksOf } from 'effect/Array';

import { withinTransaction } from '~/infra/database/transaction';
import { isSendDateReached } from '~/models/CampaignApi';
import { Campaigns } from '~/repositories/campaignRepository';
import {
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
```

(Keep the existing imports; `HousingApi` and `HousingId` are already imported, as are `housingRepository`, `eventRepository`, `HOUSING_STATUS_LABELS`, `HousingStatus`, `uuidv4`, `CampaignApi`, `HousingEventApi`, `UserApi`.)

Append the function and its private helper:

```typescript
/**
 * Revert the housings a campaign's send-date rule auto-flipped, when that
 * campaign's `sentAt` is postponed to a future date. Only touches housings we
 * can prove the system auto-flipped and that nothing has touched since:
 *   1. no *other* attached campaign has genuinely sent (`sentAt <= today`) —
 *      the postponed campaign itself is excluded, it is future by construction;
 *   2. the housing's most recent `housing:status-updated` event is the pristine
 *      `Non suivi -> En attente de retour` flip authored by the system account.
 * The write is an atomic conditional transition (`onlyIfStatus: WAITING`),
 * mirroring the forward flip's guard against concurrent writers, and one
 * `housing:status-updated` event is written per row actually reverted. Runs
 * within the caller's transaction. Returns the count reverted.
 */
export async function revertCampaignHousingsToNeverContacted(
  campaign: Pick<CampaignApi, 'id'>,
  system: UserApi,
  today: string
): Promise<number> {
  const waiting = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.WAITING
    },
    pagination: { paginate: false }
  });
  if (waiting.length === 0) {
    return 0;
  }

  const eligible = await selectUntouchedAutoFlips(
    waiting,
    campaign.id,
    system,
    today
  );
  if (eligible.length === 0) {
    return 0;
  }

  const reverted = await housingRepository.updateMany(
    eligible.map<HousingId>((housing) => ({
      geoCode: housing.geoCode,
      id: housing.id
    })),
    { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
    { onlyIfStatus: HousingStatus.WAITING }
  );
  if (reverted.length === 0) {
    return 0;
  }

  const now = new Date().toJSON();
  const events = reverted.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    createdAt: now,
    createdBy: system.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));
  await eventRepository.insertManyHousingEvents(events);

  return reverted.length;
}

/**
 * Filter `waiting` to the housings eligible for the postpone revert. Enrichment
 * reads run on the ambient transaction so they see the campaign's just-saved
 * future `sentAt`. `currentCampaignId` is excluded from the sibling-sent check —
 * it is future by construction, and reading its freshly-saved value is
 * unnecessary.
 */
async function selectUntouchedAutoFlips(
  waiting: ReadonlyArray<HousingApi>,
  currentCampaignId: string,
  system: UserApi,
  today: string
): Promise<ReadonlyArray<HousingApi>> {
  return withinTransaction(async (transaction) => {
    const siblingIds = [
      ...new Set(
        waiting
          .flatMap((housing) => housing.campaignIds ?? [])
          .filter((id) => id !== currentCampaignId)
      )
    ];
    const sentAtById = new Map<string, string | null>();
    for (const chunk of chunksOf(siblingIds, 1000)) {
      const rows = await Campaigns(transaction)
        .whereIn('id', chunk)
        .select('id', 'sent_at');
      for (const row of rows) {
        sentAtById.set(
          row.id,
          row.sent_at ? new Date(row.sent_at).toJSON().slice(0, 10) : null
        );
      }
    }

    const pairs = waiting.map(
      (housing) => [housing.geoCode, housing.id] as [string, string]
    );
    const latestEventByHousing = new Map<
      string,
      { nextOld: { status?: string } | null; nextNew: { status?: string } | null; createdBy: string }
    >();
    for (const chunk of chunksOf(pairs, 1000)) {
      const rows = await HousingEvents(transaction)
        .join(
          EVENTS_TABLE,
          `${EVENTS_TABLE}.id`,
          `${HOUSING_EVENTS_TABLE}.event_id`
        )
        .where(`${EVENTS_TABLE}.type`, 'housing:status-updated')
        .whereIn(
          [
            `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
            `${HOUSING_EVENTS_TABLE}.housing_id`
          ],
          chunk
        )
        .orderBy(`${EVENTS_TABLE}.created_at`, 'desc')
        .select(
          `${HOUSING_EVENTS_TABLE}.housing_geo_code as housing_geo_code`,
          `${HOUSING_EVENTS_TABLE}.housing_id as housing_id`,
          `${EVENTS_TABLE}.next_old as next_old`,
          `${EVENTS_TABLE}.next_new as next_new`,
          `${EVENTS_TABLE}.created_by as created_by`
        );
      for (const row of rows) {
        const key = `${row.housing_geo_code}:${row.housing_id}`;
        // Rows are DESC by created_at, so the first seen per housing is latest.
        if (!latestEventByHousing.has(key)) {
          latestEventByHousing.set(key, {
            nextOld: row.next_old,
            nextNew: row.next_new,
            createdBy: row.created_by
          });
        }
      }
    }

    return waiting.filter((housing) => {
      const hasSentSibling = (housing.campaignIds ?? [])
        .filter((id) => id !== currentCampaignId)
        .some((id) => isSendDateReached(sentAtById.get(id) ?? null, today));
      if (hasSentSibling) {
        return false;
      }

      const event = latestEventByHousing.get(
        `${housing.geoCode}:${housing.id}`
      );
      return (
        !!event &&
        event.nextOld?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] &&
        event.nextNew?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.WAITING] &&
        event.createdBy === system.id
      );
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn nx test server -- campaign-housing-service.test`
Expected: PASS (all `revertCampaignHousingsToNeverContacted` cases + the untouched flip cases).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
yarn nx typecheck server && yarn lint
git add server/src/services/campaign-housing-service.ts server/src/services/test/campaign-housing-service.test.ts
git commit -m "feat(server): revert auto-flipped housings on send-date postpone"
```

---

### Task 4: Wire the revert into `campaignController.update`

**Files:**
- Modify: `server/src/controllers/campaignController.ts` (imports ~line 22-47; `update` body ~line 278-290)
- Test: `server/src/controllers/test/campaign-api.test.ts` (`PUT /campaigns/{id}` describe block, after line 932)

**Interfaces:**
- Consumes: `isSendDateInFuture` (Task 1), `revertCampaignHousingsToNeverContacted` (Task 3).

- [ ] **Step 1: Write the failing tests**

Add `HousingEvents` to the eventRepository import and `HOUSING_STATUS_LABELS` to the models import in `campaign-api.test.ts`. Then add two tests inside `describe('PUT /campaigns/{id}', ...)`:

```typescript
it('reverts auto-flipped housings when sentAt is postponed to the future', async () => {
  const system = (await userRepository.getByEmail(config.app.system))!;
  const sentCampaign = await factories
    .campaign(establishment)
    .create({ sentAt: '2020-01-01' }, { associations: { createdBy: user } });

  const housing: HousingApi = {
    ...genHousingApi(oneOf(establishment.geoCodes)),
    status: HousingStatus.WAITING,
    subStatus: null
  };
  await Housing().insert(formatHousingRecordApi(housing));
  await CampaignsHousing().insert({
    campaign_id: sentCampaign.id,
    housing_geo_code: housing.geoCode,
    housing_id: housing.id
  });
  // Pristine system-authored auto-flip: the mark that this WAITING came from
  // the send-date rule.
  const flip = genEventApi({
    type: 'housing:status-updated',
    creator: system,
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] }
  });
  await Events().insert(formatEventApi(flip));
  await HousingEvents().insert({
    event_id: flip.id,
    housing_geo_code: housing.geoCode,
    housing_id: housing.id
  });

  const payload: CampaignUpdatePayload = {
    title: sentCampaign.title,
    description: sentCampaign.description,
    sentAt: '2999-01-01'
  };
  const { status } = await request(url)
    .put(testRoute(sentCampaign.id))
    .send(payload)
    .use(tokenProvider(user));

  expect(status).toBe(constants.HTTP_STATUS_OK);
  const actual = await Housing()
    .where({ geo_code: housing.geoCode, id: housing.id })
    .first();
  expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);

  const revertEvents = await Events()
    .where({ type: 'housing:status-updated' })
    .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
    .where({ housing_geo_code: housing.geoCode, housing_id: housing.id })
    .andWhere('created_by', system.id)
    .andWhereRaw(`next_new ->> 'status' = ?`, [
      HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
    ]);
  expect(revertEvents).toHaveLength(1);
});

it('does not revert a manually-set WAITING housing when postponed', async () => {
  const sentCampaign = await factories
    .campaign(establishment)
    .create({ sentAt: '2020-01-01' }, { associations: { createdBy: user } });

  const housing: HousingApi = {
    ...genHousingApi(oneOf(establishment.geoCodes)),
    status: HousingStatus.WAITING,
    subStatus: null
  };
  await Housing().insert(formatHousingRecordApi(housing));
  await CampaignsHousing().insert({
    campaign_id: sentCampaign.id,
    housing_geo_code: housing.geoCode,
    housing_id: housing.id
  });
  // A caseworker set WAITING by hand — the flip event is authored by the user,
  // not the system, so it must not be reverted.
  const manual = genEventApi({
    type: 'housing:status-updated',
    creator: user,
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] }
  });
  await Events().insert(formatEventApi(manual));
  await HousingEvents().insert({
    event_id: manual.id,
    housing_geo_code: housing.geoCode,
    housing_id: housing.id
  });

  const payload: CampaignUpdatePayload = {
    title: sentCampaign.title,
    description: sentCampaign.description,
    sentAt: '2999-01-01'
  };
  await request(url)
    .put(testRoute(sentCampaign.id))
    .send(payload)
    .use(tokenProvider(user));

  const actual = await Housing()
    .where({ geo_code: housing.geoCode, id: housing.id })
    .first();
  expect(actual?.status).toBe(HousingStatus.WAITING);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn nx test server -- campaign-api.test`
Expected: the "reverts auto-flipped housings" test FAILS (housing stays `WAITING`, no revert event); the "manually-set" test PASSES already (no revert exists yet).

- [ ] **Step 3: Implement the controller wiring**

In `campaignController.ts`, extend the service import (line ~42-46):

```typescript
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting,
  resolveSystemUser,
  revertCampaignHousingsToNeverContacted
} from '~/services/campaign-housing-service';
```

Add `isSendDateInFuture` to the `~/models/CampaignApi` import (line ~22-27):

```typescript
import {
  CampaignApi,
  CampaignSortableApi,
  isSendDateInFuture,
  isSendDateReached,
  toCampaignDTO
} from '~/models/CampaignApi';
```

Replace the flip block in `update` (currently lines ~276-290) with:

```typescript
  // A genuine sentAt change either flips housings to waiting (date reached) or,
  // when postponed to the future, reverts the ones the send-date rule
  // auto-flipped. Never on a metadata-only edit. The two are mutually exclusive.
  const currentDate = today();
  const sentAtChanged = updated.sentAt !== campaign.sentAt;
  const shouldFlip =
    sentAtChanged && isSendDateReached(updated.sentAt, currentDate);
  const shouldRevert =
    sentAtChanged && isSendDateInFuture(updated.sentAt, currentDate);
  // Resolved outside the transaction: a misconfigured/deleted system account
  // must not roll back the campaign's own metadata save, only defer the change.
  const system =
    shouldFlip || shouldRevert ? await resolveSystemUser() : null;

  await startTransaction(async () => {
    await campaignRepository.save(updated);
    if (system && shouldFlip) {
      await flipCampaignHousingsToWaiting(updated, system);
    }
    if (system && shouldRevert) {
      await revertCampaignHousingsToNeverContacted(
        updated,
        system,
        currentDate
      );
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn nx test server -- campaign-api.test`
Expected: PASS — both new tests, plus the pre-existing `PUT` cases (including "does not flip housings when sentAt is set to the future", which stays a no-op since its housing is `NEVER_CONTACTED`).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
yarn nx typecheck server && yarn lint
git add server/src/controllers/campaignController.ts server/src/controllers/test/campaign-api.test.ts
git commit -m "feat(server): flip campaign housings back when send date is postponed"
```

---

### Task 5: Re-author old auto-flips in the `campaign-sending-date` repair

Adds a second `decide` branch: when a housing has a genuinely-sent campaign (currently skipped) and its latest status event is a pristine, correlated, **human-authored** flip, re-author it to the system account (delete-old + create-replacement, new id, same `createdAt`), leaving the status `WAITING`.

**Files:**
- Modify: `server/src/scripts/repairs/campaign-sending-date.ts` (add `systemId` to context + resolve it in `query`; restructure `decide`; import `uuidv4`, `userRepository`, `config`)
- Test: `server/src/scripts/repairs/test/campaign-sending-date.test.ts` (update the "already sent" case; add idempotency + no-system cases; assert `systemId` in the integration test)

**Interfaces:**
- Consumes: `resolveSystemUser` semantics are inlined via `userRepository.getByEmail(config.app.system)`.
- Produces: `HousingWithContext` gains `systemId: string | null`. `decide` returns a re-author `RepairAction` (`{ deleteEventIds, createEvents }`, no `update`) for the sent-campaign human-authored branch.

- [ ] **Step 1: Write / update the failing tests**

In `campaign-sending-date.test.ts`, add `systemId: 'system-id'` to the `base()` return object. Replace the `'skips when a campaign has already sent'` test with:

```typescript
it('re-authors a human-authored flip when a campaign has already sent', () => {
  const housing = {
    ...base(),
    campaigns: [{ id: 'c', sentAt: '2020-01-01' }]
  };
  const decision = campaignSendingDateRepair.decide(housing);
  expect(decision).toMatchObject({ deleteEventIds: ['status-event-id'] });
  const action = decision as {
    createEvents: HousingEventApi[];
    update?: unknown;
  };
  expect(action.update).toBeUndefined();
  expect(action.createEvents).toHaveLength(1);
  expect(action.createEvents[0].createdBy).toBe('system-id');
  expect(action.createEvents[0].id).not.toBe('status-event-id');
  // createdAt is preserved from the original flip.
  expect(action.createEvents[0].createdAt).toBe(STATUS_EVENT_TIME);
});

it('skips a sent-campaign flip already authored by the system', () => {
  const housing = {
    ...base(),
    campaigns: [{ id: 'c', sentAt: '2020-01-01' }],
    lastStatusUpdatedEvent: statusEvent({ createdBy: 'system-id' })
  };
  expect(campaignSendingDateRepair.decide(housing)).toEqual({
    action: 'skip'
  });
});

it('skips re-authoring when the system account is unavailable', () => {
  const housing = {
    ...base(),
    systemId: null,
    campaigns: [{ id: 'c', sentAt: '2020-01-01' }]
  };
  expect(campaignSendingDateRepair.decide(housing)).toEqual({
    action: 'skip'
  });
});
```

In the integration test `'enriches an early-flipped WAITING housing so decide reverts it'`, after resolving nothing extra, assert the enriched `systemId` is populated. Add near the top of that test (it already inserts `user`; the system account is seeded):

```typescript
const system = (await userRepository.getByEmail(config.app.system))!;
```

Add imports to the test file: `import userRepository, { toUserDBO, Users } from '~/repositories/userRepository';` (extend existing) and `import config from '~/infra/config';`. Then after locating `target`:

```typescript
expect(target!.systemId).toBe(system.id);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn nx test server -- campaign-sending-date.test`
Expected: FAIL — `systemId` missing on context / re-author branch not implemented.

- [ ] **Step 3: Implement the repair changes**

In `server/src/scripts/repairs/campaign-sending-date.ts`, add imports:

```typescript
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import userRepository from '~/repositories/userRepository';
```

Add `systemId` to the context interface:

```typescript
export interface HousingWithContext extends HousingApi {
  today: string;
  systemId: string | null;
  campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[];
  lastStatusUpdatedEvent: HousingEventApi | null;
  campaignAttachedEvents: CampaignHousingEventApi[];
}
```

In `buildCandidates`, resolve the system id once (near `const now = today();`):

```typescript
      const now = today();
      const system = await userRepository.getByEmail(config.app.system);
      const systemId = system?.id ?? null;
```

and add `systemId` to the returned object in the final `waiting.map(...)`:

```typescript
        return {
          ...housing,
          today: now,
          systemId,
          campaigns: campaignsByHousing.get(k) ?? [],
          lastStatusUpdatedEvent: statusEventByHousing.get(k) ?? null,
          campaignAttachedEvents: attachedByHousing.get(k) ?? []
        };
```

Replace `decide` with the restructured version (shared pristine + correlation checks first, then branch on sent-campaign):

```typescript
  decide(housing) {
    // The latest status-updated event must be the pristine
    // "Non suivi" -> "En attente de retour" auto-flip shape.
    const event = housing.lastStatusUpdatedEvent;
    if (!event || event.type !== 'housing:status-updated') {
      return { action: 'skip' };
    }
    const { nextOld, nextNew } = event;
    if (
      nextOld?.status !==
        HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] ||
      nextNew?.status !== HOUSING_STATUS_LABELS[HousingStatus.WAITING]
    ) {
      return { action: 'skip' };
    }

    // Attributable to a campaign attachment: a campaign-attached event for this
    // housing sits within the tolerance window of the status event.
    const statusTime = new Date(event.createdAt).getTime();
    const correlated = housing.campaignAttachedEvents.some(
      (attached) =>
        Math.abs(new Date(attached.createdAt).getTime() - statusTime) <=
        ATTACHMENT_CORRELATION_TOLERANCE_MS
    );
    if (!correlated) {
      return { action: 'skip' };
    }

    const hasSentCampaign = housing.campaigns.some((campaign) =>
      isSendDateReached(campaign.sentAt, housing.today)
    );

    if (hasSentCampaign) {
      // The housing legitimately stays WAITING because a campaign genuinely
      // sent. Only re-author the flip event from the user to the system account
      // (delete-old + create-replacement, new id, same createdAt) so the live
      // postpone-revert rule can later recognise and revert it. Skip if the
      // system account is unavailable or the event is already system-authored
      // (idempotent).
      if (housing.systemId === null || event.createdBy === housing.systemId) {
        return { action: 'skip' };
      }
      return {
        deleteEventIds: [event.id],
        createEvents: [
          { ...event, id: uuidv4(), createdBy: housing.systemId }
        ]
      };
    }

    // No campaign has sent: the housing was flipped early and should be
    // reverted to NEVER_CONTACTED; the erroneous event is hard-deleted.
    return {
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: [event.id]
    };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn nx test server -- campaign-sending-date.test`
Expected: PASS — re-author, idempotency, no-system, the unchanged unsent-revert case, and the integration test's `systemId` assertion.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
yarn nx typecheck server && yarn lint
git add server/src/scripts/repairs/campaign-sending-date.ts server/src/scripts/repairs/test/campaign-sending-date.test.ts
git commit -m "feat(server): re-author old auto-flip events to the system account"
```

---

### Task 6: Full-suite verification

- [ ] **Step 1: Run the whole server suite**

Run: `yarn nx test server`
Expected: PASS. Investigate any failure before proceeding — do not claim success without green output.

- [ ] **Step 2: Typecheck + lint the workspace surface touched**

Run: `yarn nx typecheck server && yarn lint`
Expected: PASS.

- [ ] **Step 3: Format**

Run: `yarn format:fix`
Then stage and, if anything changed, commit:

```bash
git add -A server
git commit -m "style(server): format campaign send-date revert changes" || echo "nothing to format"
```

---

## Self-Review

**Spec coverage:**
- Part 1 trigger (changed + strictly future, mutually exclusive) → Task 1 (`isSendDateInFuture`) + Task 4 (controller wiring). ✓
- Part 1 eligibility (no sibling sent; pristine system-authored latest event) → Task 3 (`selectUntouchedAutoFlips`). ✓
- Part 1 write + reverse event → Task 3 (`onlyIfStatus: WAITING`, one event per reverted row). ✓
- File rename → Task 2. ✓
- Part 2 backfill re-author (delete-old + create-replacement, new id, same createdAt, idempotent, disjoint from never-sent branch) → Task 5. ✓
- Residual gap (correlation can't confirm) → inherent in Task 5's correlation gate; no code needed. ✓
- Out of scope: `createFromGroup`/cron untouched (not modified); no harness action-model change (Task 5 uses existing `deleteEventIds`/`createEvents`). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands. ✓

**Type consistency:** `revertCampaignHousingsToNeverContacted(campaign, system, today)` signature identical in Task 3 (definition), Task 4 (call). `isSendDateInFuture(sentAt, today)` identical in Task 1 and Task 4. `HousingWithContext.systemId: string | null` defined and consumed consistently in Task 5. Reverse event uses `nextOld: WAITING` → `nextNew: NEVER_CONTACTED`; forward flip uses the opposite — intentional. ✓
