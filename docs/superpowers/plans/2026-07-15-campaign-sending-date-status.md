# Campaign Sending-Date-Gated Housing Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a campaign's housings flip from `NEVER_CONTACTED` ("Non suivi") to `WAITING` ("En attente de retour") only once the campaign's sending date (`sentAt`) has arrived, and backfill the housings the old unconditional rule flipped early.

**Architecture:** Extract the existing inline flip into a shared service (`flipHousingsToWaiting` + a campaign-level `flipCampaignHousingsToWaiting`). Three forward call sites use it: `createFromGroup` (immediate, gated on `sentAt <= today`), `update` (immediate when a saved `sentAt` reaches today), and a new idempotent daily cron (flips future-dated campaigns once their date passes). A separate one-shot backfill runs through the existing repair harness as repair `campaign-sending-date`, reverting housings whose campaigns never actually sent. The forward logic and the repair act on disjoint `sentAt` ranges, so they cannot fight over a housing.

**Tech Stack:** TypeScript, Express, Knex (Postgres, partitioned `fast_housing`), Vitest + `@fast-check/vitest`, `date-fns`, `@commander-js/extra-typings` (zlv CLI), Clever Cloud cron.

## Global Constraints

- **TDD is mandatory** — write the failing test first, watch it fail, then implement. (CLAUDE.md)
- **Vitest only**, never Jest. Run with `yarn nx test server -- <pattern>` from the repo root. (CLAUDE.md)
- **Tests are not a type/lint gate.** After each task also run `yarn nx typecheck server` **and** `yarn lint` — passing tests prove neither.
- **Knex only** — no Kysely anywhere in this repo. Repositories use the Knex query builder, never raw SQL; scripts/repairs may use the table accessors directly.
- **Transactions:** `startTransaction()` in controllers/scripts, `withinTransaction()` inside repositories. Never open a top-level transaction in a repository.
- **`housingRepository.find` does not participate in the caller's ambient transaction** — never rely on reading rows written earlier in the same transaction. `createFromGroup` therefore passes its already-in-memory housings to the flip (never re-queries them).
- **Event status payloads store French label strings, not enum numbers.** Use `HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]` → `'Non suivi'` and `HOUSING_STATUS_LABELS[HousingStatus.WAITING]` → `'En attente de retour'` verbatim.
- **The automated flip's `housing:status-updated` events are attributed to the system account** (`config.app.system`), resolved inside the flip service — no call site passes a `createdBy`. The flip is a rule the system applies, and `isUserModified` treats `@…beta.gouv.fr` creators as not user-modified, so system attribution keeps `isSupervised` honest. The user's genuine action — attaching housings to a campaign — keeps its `auth.userId` attribution on the `housing:campaign-attached` events.
- **`HousingStatus` is a numeric enum:** `NEVER_CONTACTED = 0`, `WAITING = 1`.
- **Date comparison is on `yyyy-MM-dd` strings**, compared lexicographically. `sentAt` may arrive as a longer ISO string, so always `.slice(0, 10)` before comparing.
- **Commit scopes are workspace-level:** `feat(server)`, `fix(server)`, `chore(server)`, `test(server)` — never subdirectory names. Commit messages in English.
- **Fixtures extend `gen*DTO()`** from `@zerologementvacant/models`; assert with primitive table accessors (`Housing()`, `Events()`, `Campaigns()`), not the repository under test.
- **No frontend changes.** `CampaignSentAtModal` and the `updateCampaign` mutation already send `sentAt`; `createFromGroup` and `update` already accept it. This plan is server-only.

---

## File Structure

**New files:**

- `server/src/utils/date.ts` — `today()`: the server's current calendar date as `yyyy-MM-dd`.
- `server/src/services/campaignHousingService.ts` — `flipHousingsToWaiting()` (writes for an already-selected set) and `flipCampaignHousingsToWaiting()` (queries a campaign's NEVER_CONTACTED housings, then flips).
- `server/src/services/test/campaignHousingService.test.ts` — integration tests for the flip service.
- `server/src/scripts/flip-sent-campaign-housings/task.ts` — `flipSentCampaignHousings()`: find campaigns past their send date that still hold NEVER_CONTACTED housings, flip each.
- `server/src/scripts/flip-sent-campaign-housings/index.ts` — thin cron entry: resolve admin user, run the task, close the DB pool.
- `server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh` — cron wrapper referenced from `cron.json`.
- `server/src/scripts/flip-sent-campaign-housings/test/task.test.ts` — integration tests for the cron task (flip + idempotency + future-dated skip).
- `server/src/scripts/repairs/campaign-sending-date.ts` — the backfill repair (`query()` + `decide()`).
- `server/src/scripts/repairs/test/campaign-sending-date.test.ts` — unit tests for `decide()` (one per skip branch, happy path, tolerance boundary) + one `query()` integration test.

**Modified files:**

- `server/src/models/CampaignApi.ts` — add pure `isSendDateReached()`.
- `server/src/models/test/CampaignApi.test.ts` (create if absent) — tests for `isSendDateReached()`.
- `server/src/controllers/campaignController.ts` — gate the flip in `createFromGroup`; add a gated flip to `update`.
- `server/src/controllers/test/campaign-api.test.ts` — update `createFromGroup` expectations to the gated behavior; add `update` flip tests.
- `server/src/scripts/repairs/index.ts` — register `campaign-sending-date`.
- `clevercloud/cron.json` — add the daily cron entry.

---

## Task 1: Date + send-date predicate helpers

**Files:**

- Create: `server/src/utils/date.ts`
- Modify: `server/src/models/CampaignApi.ts` (add `isSendDateReached`)
- Test: `server/src/utils/test/date.test.ts` (create), `server/src/models/test/CampaignApi.test.ts` (create if absent)

**Interfaces:**

- Produces:
  - `today(): string` — server's current date as `yyyy-MM-dd`.
  - `isSendDateReached(sentAt: string | null, today: string): boolean` — `true` iff `sentAt` is set and `sentAt.slice(0, 10) <= today`.

- [ ] **Step 1: Write the failing predicate test**

Create `server/src/models/test/CampaignApi.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { isSendDateReached } from '~/models/CampaignApi';

describe('isSendDateReached', () => {
  const today = '2026-07-15';

  it('returns false when sentAt is null', () => {
    expect(isSendDateReached(null, today)).toBe(false);
  });

  it('returns false when sentAt is in the future', () => {
    expect(isSendDateReached('2026-07-16', today)).toBe(false);
  });

  it('returns true when sentAt is today', () => {
    expect(isSendDateReached('2026-07-15', today)).toBe(true);
  });

  it('returns true when sentAt is in the past', () => {
    expect(isSendDateReached('2026-07-14', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateReached('2026-07-15T23:59:59.000Z', today)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test server -- CampaignApi`
Expected: FAIL — `isSendDateReached` is not exported.

- [ ] **Step 3: Implement `isSendDateReached`**

Append to `server/src/models/CampaignApi.ts`:

```typescript
/**
 * Whether a campaign's sending date has arrived: `sentAt` is set and on or
 * before `today`. Both are compared as `yyyy-MM-dd` strings, so a longer ISO
 * `sentAt` is truncated first.
 */
export function isSendDateReached(
  sentAt: CampaignApi['sentAt'],
  today: string
): boolean {
  return sentAt !== null && sentAt.slice(0, 10) <= today;
}
```

- [ ] **Step 4: Run the predicate test to verify it passes**

Run: `yarn nx test server -- CampaignApi`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing `today()` test**

Create `server/src/utils/test/date.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { today } from '~/utils/date';

describe('today', () => {
  it('returns the current date as a yyyy-MM-dd string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `yarn nx test server -- utils/test/date`
Expected: FAIL — `~/utils/date` does not exist.

- [ ] **Step 7: Implement `today()`**

Create `server/src/utils/date.ts`:

```typescript
import { format } from 'date-fns';

/**
 * The server's current calendar date as a `yyyy-MM-dd` string, for comparing
 * against campaign `sentAt` values (also `yyyy-MM-dd`).
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
```

- [ ] **Step 8: Run both tests and typecheck/lint**

Run: `yarn nx test server -- "CampaignApi|utils/test/date"` then `yarn nx typecheck server` then `yarn lint`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/utils/date.ts server/src/utils/test/date.test.ts \
        server/src/models/CampaignApi.ts server/src/models/test/CampaignApi.test.ts
git commit -m "feat(server): add today() and isSendDateReached() helpers"
```

---

## Task 2: Flip service

**Files:**

- Create: `server/src/services/campaignHousingService.ts`
- Test: `server/src/services/test/campaignHousingService.test.ts`

**Interfaces:**

- Consumes: `housingRepository.updateMany`, `housingRepository.find`, `eventRepository.insertManyHousingEvents`, `userRepository.getByEmail`, `config.app.system`, `UserMissingError`, `HousingId` (`{ geoCode, id }`), `HOUSING_STATUS_LABELS`, `HousingStatus`.
- Produces:
  - `flipHousingsToWaiting(housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>): Promise<number>` — writes one `housing:status-updated` event per housing and sets `{ status: WAITING, subStatus: null }`. The events are attributed to the **system account** (`config.app.system`), resolved inside the service (throws `UserMissingError` if absent) — no `createdBy` parameter. Assumes the caller filtered to NEVER_CONTACTED and owns the transaction. Returns the count flipped.
  - `flipCampaignHousingsToWaiting(campaign: Pick<CampaignApi, 'id'>): Promise<number>` — fetches the campaign's still-NEVER_CONTACTED housings, then calls `flipHousingsToWaiting`. Idempotent; returns the count flipped.

- [ ] **Step 1: Write the failing test**

Create `server/src/services/test/campaignHousingService.test.ts`. Mirror the seeding setup used at the top of `server/src/controllers/test/campaign-api.test.ts` (imports `formatEstablishmentApi`, `toUserDBO`, `formatHousingRecordApi`, `formatCampaignApi`, `genEstablishmentApi`, `genUserApi`, `genHousingApi`, `genCampaignApi`, and the `Establishments()`, `Users()`, `Housing()`, `Campaigns()`, `CampaignsHousing()` accessors).

```typescript
import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, describe, expect, it } from 'vitest';

import { startTransaction } from '~/infra/database/transaction';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import userRepository, {
  Users,
  toUserDBO
} from '~/repositories/userRepository';
import config from '~/infra/config';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import { Events, HOUSING_EVENTS_TABLE } from '~/repositories/eventRepository';
import {
  genEstablishmentApi,
  genUserApi,
  genHousingApi,
  genCampaignApi
} from '~/test/testFixtures';
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting
} from '~/services/campaignHousingService';

describe('campaignHousingService', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('flipHousingsToWaiting', () => {
    it('sets NEVER_CONTACTED housings to WAITING and records events', async () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));

      const flipped = await startTransaction(() =>
        flipHousingsToWaiting([housing])
      );

      expect(flipped).toBe(1);
      const actual = await Housing()
        .where({ geo_code: housing.geoCode, id: housing.id })
        .first();
      expect(actual?.status).toBe(HousingStatus.WAITING);
      expect(actual?.sub_status).toBeNull();

      const events = await Events()
        .where({ type: 'housing:status-updated' })
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      expect(events).toHaveLength(1);
      // The automated flip is attributed to the system account, not the caller.
      const system = await userRepository.getByEmail(config.app.system);
      expect(events[0].created_by).toBe(system?.id);
    });

    it('returns 0 and writes nothing for an empty set', async () => {
      const flipped = await startTransaction(() => flipHousingsToWaiting([]));
      expect(flipped).toBe(0);
    });
  });

  describe('flipCampaignHousingsToWaiting', () => {
    it('flips only the campaign NEVER_CONTACTED housings', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      const neverContacted = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      const alreadyWaiting = {
        ...genHousingApi(),
        status: HousingStatus.WAITING,
        subStatus: null
      };
      await Housing().insert(
        [neverContacted, alreadyWaiting].map(formatHousingRecordApi)
      );
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        [neverContacted, alreadyWaiting].map((housing) => ({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      );

      const flipped = await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign)
      );

      expect(flipped).toBe(1);
      const actual = await Housing()
        .where({ geo_code: neverContacted.geoCode, id: neverContacted.id })
        .first();
      expect(actual?.status).toBe(HousingStatus.WAITING);
    });

    it('is idempotent — a second run flips nothing', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      await startTransaction(() => flipCampaignHousingsToWaiting(campaign));
      const second = await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign)
      );
      expect(second).toBe(0);
    });
  });
});
```

> If a named accessor/formatter import above resolves differently (e.g. `Establishments` is exported from a different path), copy the exact import lines from `server/src/controllers/test/campaign-api.test.ts`, which seeds the same tables.

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test server -- campaignHousingService`
Expected: FAIL — `~/services/campaignHousingService` does not exist.

- [ ] **Step 3: Implement the service**

Create `server/src/services/campaignHousingService.ts`:

```typescript
import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import type { CampaignApi } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

/**
 * Flip an already-selected set of NEVER_CONTACTED housings to WAITING, writing
 * one `housing:status-updated` event per housing. The caller is responsible for
 * having filtered `housings` to NEVER_CONTACTED and for owning the transaction
 * (the repository writes join the ambient one). Returns the number flipped.
 *
 * The flip is the send-date rule the system applies, not a manual status edit,
 * so the events are attributed to the system account (`config.app.system`) —
 * uniformly across campaign creation, update and the daily cron. That also keeps
 * `isSupervised` from counting the automated change as human-touched, since a
 * `@…beta.gouv.fr` creator is not treated as user-modified.
 *
 * `createFromGroup` calls this with housings it already holds in memory rather
 * than re-querying, because `housingRepository.find` does not see rows written
 * earlier in the same transaction.
 */
export async function flipHousingsToWaiting(
  housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>
): Promise<number> {
  if (housings.length === 0) {
    return 0;
  }

  const system = await userRepository.getByEmail(config.app.system);
  if (!system) {
    throw new UserMissingError(config.app.system);
  }

  const now = new Date().toJSON();
  const events = housings.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: now,
    createdBy: system.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));

  await Promise.all([
    housingRepository.updateMany(
      housings.map<HousingId>((housing) => ({
        geoCode: housing.geoCode,
        id: housing.id
      })),
      { status: HousingStatus.WAITING, subStatus: null }
    ),
    eventRepository.insertManyHousingEvents(events)
  ]);

  return housings.length;
}

/**
 * Fetch a campaign's still-NEVER_CONTACTED housings and flip them to WAITING.
 * Idempotent: a campaign whose housings are all past NEVER_CONTACTED yields an
 * empty set and writes nothing. Runs within the caller's transaction.
 */
export async function flipCampaignHousingsToWaiting(
  campaign: Pick<CampaignApi, 'id'>
): Promise<number> {
  const housings = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.NEVER_CONTACTED
    },
    pagination: { paginate: false }
  });
  return flipHousingsToWaiting(housings);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test server -- campaignHousingService`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck and lint**

Run: `yarn nx typecheck server` then `yarn lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/campaignHousingService.ts \
        server/src/services/test/campaignHousingService.test.ts
git commit -m "feat(server): add campaign housing flip-to-waiting service"
```

---

## Task 3: Gate the flip in `createFromGroup`

**Files:**

- Modify: `server/src/controllers/campaignController.ts` (`createFromGroup`, lines ~97–240, and imports)
- Test: `server/src/controllers/test/campaign-api.test.ts`

**Interfaces:**

- Consumes: `isSendDateReached`, `today`, `flipHousingsToWaiting`.
- Produces: no new exports; changes `createFromGroup` so the status flip happens only when `isSendDateReached(campaign.sentAt, today())`.

- [ ] **Step 1: Update the existing `createFromGroup` tests to the gated behavior**

In `server/src/controllers/test/campaign-api.test.ts`, find the `POST /groups/:id/campaigns` (`createFromGroup`) describe block. The current tests assert NEVER_CONTACTED housings always flip to WAITING. Change them so:

- When the request body's `sentAt` is `null` (or omitted), NEVER_CONTACTED housings stay NEVER_CONTACTED and **no** `housing:status-updated` event is written.
- Add a case: `sentAt` set to a **past** date (e.g. `'2020-01-01'`) → NEVER_CONTACTED housings flip to WAITING and one `housing:status-updated` event per flipped housing is written.
- Add a case: `sentAt` set to a **future** date (e.g. `'2999-01-01'`) → housings stay NEVER_CONTACTED, no status event.
- In every case, the `housing:campaign-attached` events and the `campaigns_housing` links are still written for **all** housings regardless of `sentAt`.

Concrete assertions to add (adapt to the block's existing fixtures/helpers):

```typescript
it('does not flip housings when sentAt is null', async () => {
  const { status, body } = await request(app)
    .post(`/api/groups/${group.id}/campaigns`)
    .send({ title: 'C', description: '', sentAt: null })
    .use(tokenProvider(user));

  expect(status).toBe(constants.HTTP_STATUS_CREATED);
  const housings = await Housing().whereIn(
    ['geo_code', 'id'],
    groupHousings.map((h) => [h.geoCode, h.id])
  );
  housings.forEach((h) => expect(h.status).toBe(HousingStatus.NEVER_CONTACTED));
  const statusEvents = await Events()
    .where({ type: 'housing:status-updated' })
    .whereIn('id', (q) =>
      q
        .select('event_id')
        .from('housing_events')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          groupHousings.map((h) => [h.geoCode, h.id])
        )
    );
  expect(statusEvents).toHaveLength(0);
  const links = await CampaignsHousing().where({ campaign_id: body.id });
  expect(links).toHaveLength(groupHousings.length);
});

it('flips housings immediately when sentAt is already past', async () => {
  const { status, body } = await request(app)
    .post(`/api/groups/${group.id}/campaigns`)
    .send({ title: 'C', description: '', sentAt: '2020-01-01' })
    .use(tokenProvider(user));

  expect(status).toBe(constants.HTTP_STATUS_CREATED);
  const neverContacted = groupHousings.filter(
    (h) => h.status === HousingStatus.NEVER_CONTACTED
  );
  const housings = await Housing().whereIn(
    ['geo_code', 'id'],
    neverContacted.map((h) => [h.geoCode, h.id])
  );
  housings.forEach((h) => expect(h.status).toBe(HousingStatus.WAITING));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn nx test server -- campaign-api`
Expected: FAIL — the current unconditional flip flips even when `sentAt` is null.

- [ ] **Step 3: Update the imports in `campaignController.ts`**

At the top of `server/src/controllers/campaignController.ts`:

- Add `isSendDateReached` to the existing import from `~/models/CampaignApi`:

```typescript
import {
  CampaignApi,
  CampaignSortableApi,
  isSendDateReached,
  toCampaignDTO
} from '~/models/CampaignApi';
```

- Add the new imports:

```typescript
import { today } from '~/utils/date';
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting
} from '~/services/campaignHousingService';
```

(`flipCampaignHousingsToWaiting` is consumed by Task 4 in the same file; import both now.)

- [ ] **Step 4: Rewrite the flip in `createFromGroup`**

Keep `const neverContactedHousings = housings.filter((housing) => housing.status === HousingStatus.NEVER_CONTACTED);` and keep building `campaignHousingEvents` (the `housing:campaign-attached` events over **all** housings). **Delete** the `housingEvents` builder (the `neverContactedHousings.map<HousingEventApi>(...)` block that built `housing:status-updated` events).

Replace the transaction body (the `await startTransaction(async () => { ... })` block) with:

```typescript
await startTransaction(async () => {
  await senderRepository.save(sender);
  await draftRepository.save(draft);
  await campaignRepository.save(campaign);
  await campaignDraftRepository.save(campaign, draft);

  await Promise.all([
    campaignHousingRepository.insertHousingList(campaign.id, housings),
    eventRepository.insertManyCampaignHousingEvents(campaignHousingEvents)
  ]);

  // Gate the NEVER_CONTACTED -> WAITING flip on the sending date. Pass the
  // in-memory housings: housingRepository.find would not see the campaign
  // links just inserted in this transaction.
  if (isSendDateReached(campaign.sentAt, today())) {
    await flipHousingsToWaiting(neverContactedHousings);
  }
});
```

- [ ] **Step 5: Remove now-unused imports**

The controller no longer builds `housing:status-updated` events inline, so `HOUSING_STATUS_LABELS` and the `HousingEventApi` type may now be unused. Run `yarn lint` (Step 7) to detect this; remove `HOUSING_STATUS_LABELS` from the `@zerologementvacant/models` import and `HousingEventApi` from the `~/models/EventApi` import **only if** lint reports them unused. Keep `HousingStatus`, `HousingApi`, `shouldReset`, and `CampaignHousingEventApi` (still used).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn nx test server -- campaign-api`
Expected: PASS — including the new null/past/future cases.

- [ ] **Step 7: Typecheck and lint**

Run: `yarn nx typecheck server` then `yarn lint`
Expected: PASS (and no unused-import warnings).

- [ ] **Step 8: Commit**

```bash
git add server/src/controllers/campaignController.ts \
        server/src/controllers/test/campaign-api.test.ts
git commit -m "feat(server): gate createFromGroup housing flip on the sending date"
```

---

## Task 4: Gate a flip in `update`

**Files:**

- Modify: `server/src/controllers/campaignController.ts` (`update`, lines ~242–283)
- Test: `server/src/controllers/test/campaign-api.test.ts`

**Interfaces:**

- Consumes: `isSendDateReached`, `today`, `flipCampaignHousingsToWaiting`, `startTransaction`.
- Produces: `update` now flips the campaign's still-NEVER_CONTACTED housings when the saved `sentAt` is `<= today`.

- [ ] **Step 1: Write the failing `update` tests**

In the `PUT /campaigns/:id` (`update`) describe block of `campaign-api.test.ts`, add:

```typescript
it('flips housings when sentAt is set to today or the past', async () => {
  const campaign = genCampaignApi(establishment.id, user); // sentAt null
  const housing = {
    ...genHousingApi(),
    status: HousingStatus.NEVER_CONTACTED,
    subStatus: null
  };
  await Housing().insert(formatHousingRecordApi(housing));
  await Campaigns().insert(formatCampaignApi(campaign));
  await CampaignsHousing().insert({
    campaign_id: campaign.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode
  });

  const { status } = await request(app)
    .put(`/api/campaigns/${campaign.id}`)
    .send({ title: campaign.title, description: '', sentAt: '2020-01-01' })
    .use(tokenProvider(user));

  expect(status).toBe(constants.HTTP_STATUS_OK);
  const actual = await Housing()
    .where({ geo_code: housing.geoCode, id: housing.id })
    .first();
  expect(actual?.status).toBe(HousingStatus.WAITING);
});

it('does not flip housings when sentAt is set to the future', async () => {
  const campaign = genCampaignApi(establishment.id, user);
  const housing = {
    ...genHousingApi(),
    status: HousingStatus.NEVER_CONTACTED,
    subStatus: null
  };
  await Housing().insert(formatHousingRecordApi(housing));
  await Campaigns().insert(formatCampaignApi(campaign));
  await CampaignsHousing().insert({
    campaign_id: campaign.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode
  });

  await request(app)
    .put(`/api/campaigns/${campaign.id}`)
    .send({ title: campaign.title, description: '', sentAt: '2999-01-01' })
    .use(tokenProvider(user));

  const actual = await Housing()
    .where({ geo_code: housing.geoCode, id: housing.id })
    .first();
  expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn nx test server -- campaign-api`
Expected: FAIL — `update` currently performs no flip.

- [ ] **Step 3: Rewrite the tail of `update`**

Replace the final save + response of `update` (the `await campaignRepository.save(updated);` line and the response line) with:

```typescript
await startTransaction(async () => {
  await campaignRepository.save(updated);
  // If the saved sending date has arrived (same-day confirmation or a
  // retroactive correction to a past date), flip the campaign's still
  // NEVER_CONTACTED housings now instead of waiting for the daily cron.
  if (isSendDateReached(updated.sentAt, today())) {
    await flipCampaignHousingsToWaiting(updated);
  }
});

response.status(constants.HTTP_STATUS_OK).json(toCampaignDTO(updated));
```

Leave the existing `sentAt cannot be unset` guard and the `updated` object construction unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn nx test server -- campaign-api`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint**

Run: `yarn nx typecheck server` then `yarn lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/campaignController.ts \
        server/src/controllers/test/campaign-api.test.ts
git commit -m "feat(server): flip campaign housings when update sets a reached sending date"
```

---

## Task 5: Daily cron task core

**Files:**

- Create: `server/src/scripts/flip-sent-campaign-housings/task.ts`
- Test: `server/src/scripts/flip-sent-campaign-housings/test/task.test.ts`

**Interfaces:**

- Consumes: `flipCampaignHousingsToWaiting`, `startTransaction`, `CampaignsHousing`, `campaignsHousingTable`, `campaignsTable`, `housingTable`, `HousingStatus`.
- Produces:
  - `FlipSentCampaignHousingsOptions = { today: string }`
  - `FlipSentCampaignHousingsSummary = { campaigns: number; housings: number }`
  - `flipSentCampaignHousings(options: FlipSentCampaignHousingsOptions): Promise<FlipSentCampaignHousingsSummary>` — finds campaigns whose `sent_at::date <= today` that still hold a NEVER_CONTACTED housing, and flips each within its own transaction.

- [ ] **Step 1: Write the failing test**

Create `server/src/scripts/flip-sent-campaign-housings/test/task.test.ts` (seed with the same accessors/fixtures as Task 2):

```typescript
import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import { Events } from '~/repositories/eventRepository';
import {
  genEstablishmentApi,
  genUserApi,
  genHousingApi,
  genCampaignApi
} from '~/test/testFixtures';
import { flipSentCampaignHousings } from '../task';

describe('flipSentCampaignHousings', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const today = '2026-07-15';

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  async function seedCampaign(sentAt: string | null) {
    const campaign = { ...genCampaignApi(establishment.id, user), sentAt };
    const housing = {
      ...genHousingApi(),
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await Campaigns().insert(formatCampaignApi(campaign));
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });
    return { campaign, housing };
  }

  it('flips housings of campaigns whose send date has passed', async () => {
    const { housing } = await seedCampaign('2020-01-01');

    const summary = await flipSentCampaignHousings({ today });

    expect(summary.housings).toBeGreaterThanOrEqual(1);
    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual?.status).toBe(HousingStatus.WAITING);
  });

  it('leaves future-dated campaigns untouched', async () => {
    const { housing } = await seedCampaign('2999-01-01');

    await flipSentCampaignHousings({ today });

    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);
  });

  it('is idempotent — a second run writes no new status events', async () => {
    const { housing } = await seedCampaign('2020-01-01');

    await flipSentCampaignHousings({ today });
    const eventsAfterFirst = await Events()
      .where({ type: 'housing:status-updated' })
      .whereIn('id', (q) =>
        q.select('event_id').from('housing_events').where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
      );

    await flipSentCampaignHousings({ today });
    const eventsAfterSecond = await Events()
      .where({ type: 'housing:status-updated' })
      .whereIn('id', (q) =>
        q.select('event_id').from('housing_events').where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
      );

    expect(eventsAfterSecond).toHaveLength(eventsAfterFirst.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test server -- flip-sent-campaign-housings`
Expected: FAIL — `../task` does not exist.

- [ ] **Step 3: Implement the task**

Create `server/src/scripts/flip-sent-campaign-housings/task.ts`:

```typescript
import { HousingStatus } from '@zerologementvacant/models';

import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import {
  campaignsHousingTable,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import { housingTable } from '~/repositories/housingRepository';
import { flipCampaignHousingsToWaiting } from '~/services/campaignHousingService';

const logger = createLogger('flip-sent-campaign-housings');

export interface FlipSentCampaignHousingsOptions {
  /** Current calendar date as `yyyy-MM-dd`. */
  today: string;
}

export interface FlipSentCampaignHousingsSummary {
  campaigns: number;
  housings: number;
}

/**
 * Find campaigns whose `sent_at` date has arrived and that still hold at least
 * one NEVER_CONTACTED housing, and flip those housings to WAITING. Idempotent:
 * settled campaigns are excluded by the NEVER_CONTACTED join, and each flip is a
 * no-op if nothing remains.
 */
export async function flipSentCampaignHousings(
  options: FlipSentCampaignHousingsOptions
): Promise<FlipSentCampaignHousingsSummary> {
  const rows = await CampaignsHousing()
    .join(
      campaignsTable,
      `${campaignsTable}.id`,
      `${campaignsHousingTable}.campaign_id`
    )
    .join(housingTable, function () {
      this.on(
        `${housingTable}.id`,
        '=',
        `${campaignsHousingTable}.housing_id`
      ).andOn(
        `${housingTable}.geo_code`,
        '=',
        `${campaignsHousingTable}.housing_geo_code`
      );
    })
    .whereNotNull(`${campaignsTable}.sent_at`)
    .whereRaw(`${campaignsTable}.sent_at::date <= ?::date`, [options.today])
    .where(`${housingTable}.status`, HousingStatus.NEVER_CONTACTED)
    .distinct(`${campaignsTable}.id as id`);

  const campaignIds = rows.map((row) => row.id as string);
  logger.info(`Found ${campaignIds.length} campaign(s) to settle`);

  let housings = 0;
  for (const id of campaignIds) {
    await startTransaction(async () => {
      housings += await flipCampaignHousingsToWaiting({ id });
    });
  }

  logger.info('Settled sent-campaign housings', {
    campaigns: campaignIds.length,
    housings
  });
  return { campaigns: campaignIds.length, housings };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test server -- flip-sent-campaign-housings`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck and lint**

Run: `yarn nx typecheck server` then `yarn lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/flip-sent-campaign-housings/task.ts \
        server/src/scripts/flip-sent-campaign-housings/test/task.test.ts
git commit -m "feat(server): add task flipping sent-campaign housings to waiting"
```

---

## Task 6: Cron entry point, wrapper, and `cron.json`

**Files:**

- Create: `server/src/scripts/flip-sent-campaign-housings/index.ts`
- Create: `server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh`
- Modify: `clevercloud/cron.json`

**Interfaces:**

- Consumes: `flipSentCampaignHousings`, `today`, `db`, `config.app.isReviewApp`.
- Produces: a runnable cron that settles sent-campaign housings once a day.

This task has no unit test (it is an entry-point wiring + a shell wrapper + a config line); it is verified by running the script against a database (Step 4).

- [ ] **Step 1: Create the entry point**

Create `server/src/scripts/flip-sent-campaign-housings/index.ts`:

```typescript
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { today } from '~/utils/date';
import { flipSentCampaignHousings } from './task';

const logger = createLogger('flip-sent-campaign-housings');

async function run(): Promise<void> {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  const summary = await flipSentCampaignHousings({ today: today() });
  logger.info('Flipped sent-campaign housings to WAITING', summary);
}

run()
  .finally(() => db.destroy())
  .then(() => {
    logger.info('DB connection destroyed.');
  });
```

> The system account is resolved inside the flip service (`config.app.system`), so the entry point no longer looks up the admin user — it just guards on the review app and runs the task. The review-app flag is `config.app.isReviewApp` (verified in `server/src/infra/config.ts`; the scripts README's `config.application.isReviewApp` is stale).

- [ ] **Step 2: Create the cron wrapper**

Create `server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh`:

```bash
#!/bin/bash
#
# Daily cron: flip NEVER_CONTACTED housings of campaigns whose sending date has
# passed to WAITING. See docs/superpowers/plans/2026-07-15-campaign-sending-date-status.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$SERVER_DIR"
NODE_OPTIONS='--import tsx/esm' yarn tsx src/scripts/flip-sent-campaign-housings/index.ts
```

Make it executable:

```bash
chmod +x server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh
```

- [ ] **Step 3: Add the cron entry**

Edit `clevercloud/cron.json` to add the daily entry (04:00) alongside the existing monthly-logs entry:

```json
[
  "0 4 * * * $ROOT/server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh",
  "0 3 1 * * $ROOT/server/src/scripts/logs/export-monthly-logs.sh"
]
```

- [ ] **Step 4: Verify the script runs end-to-end against a local DB**

With the local dev/test database up and seeded, run:

```bash
cd server && NODE_OPTIONS='--import tsx/esm' yarn tsx src/scripts/flip-sent-campaign-housings/index.ts
```

Expected: it logs `Found N campaign(s) to settle`, `Flipped sent-campaign housings to WAITING { campaigns, housings }`, then `DB connection destroyed.` and exits 0. Re-run it and confirm a second run reports `housings: 0` (idempotent).

- [ ] **Step 5: Typecheck, lint, validate JSON**

Run: `yarn nx typecheck server` then `yarn lint` then `node --experimental-vm-modules -e "JSON.parse(require('fs').readFileSync('clevercloud/cron.json','utf8'))"` (or `cat clevercloud/cron.json | jq .`)
Expected: all PASS; `cron.json` parses.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/flip-sent-campaign-housings/index.ts \
        server/src/scripts/flip-sent-campaign-housings/flip-sent-campaign-housings.sh \
        clevercloud/cron.json
git commit -m "feat(server): add daily cron settling sent-campaign housing statuses"
```

---

## Task 7: Backfill repair `campaign-sending-date`

**Files:**

- Create: `server/src/scripts/repairs/campaign-sending-date.ts`
- Modify: `server/src/scripts/repairs/index.ts`
- Test: `server/src/scripts/repairs/test/campaign-sending-date.test.ts`

> **⚠️ Harness contract (post-rebase onto `43e2d4de7`).** The repair harness was refactored to stream: `Repair.query()` now returns a **`RowStream<H>`** (a branded object-mode `Readable`), not `Promise<H[]>`. `plan()` pipes that stream through a `Writable` decider. `RepairAction` and `decide` are unchanged (`decide` still sync, returning `{ update, deleteEventIds, createEvents } | { action: 'skip' } | { action: 'error', reason }`), and `apply` still applies `update` (status/sub_status) and hard-deletes `deleteEventIds` exactly as this repair needs.
>
> Build the stream with `rows<H>(...)` from `./lib/row-stream`: `rows(knexStream)` for a Knex `.stream()`, or `rows(iterable)` for an in-memory set. **This repair enriches in bulk** (three per-batch join-table lookups, per the "pure transform + bulk enrich" rule) and returns a real camelCase `HousingApi` from `housingRepository.find`, so it uses the in-memory form: build the enriched candidates in an `async function buildCandidates()` and stream them via a `Readable` wrapped in `rows<HousingWithContext>()`. A raw `Housing().stream()` is **not** an option here — there is no response camel-casing (`index.ts:45` only camel→snakes query identifiers), so streamed rows would be snake_case DBO with `geoCode`/`subStatus` undefined, breaking both `decide` and `plan()`'s `housingGeoCode` extraction.

**Interfaces:**

- Consumes: `Repair` from `./lib/types`; `rows` (value) and `RowStream` (type) from `./lib/row-stream`; `Readable` from `node:stream`; `isSendDateReached`; `today`; `HOUSING_STATUS_LABELS`; `HousingStatus`; `housingRepository.find`; the `CampaignsHousing`, `HousingEvents`, `CampaignHousingEvents` accessors and the `campaignsTable`, `campaignsHousingTable`, `EVENTS_TABLE`, `HOUSING_EVENTS_TABLE`, `CAMPAIGN_HOUSING_EVENTS_TABLE` constants; `chunksOf` from `effect/Array`.
- Produces: `campaignSendingDateRepair: Repair<HousingWithContext>` (with `query(): RowStream<HousingWithContext>`), registered under key `'campaign-sending-date'`.

The enriched working type (only these fields beyond `HousingApi` are read by `decide`):

```typescript
interface HousingWithContext extends HousingApi {
  today: string;
  campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[];
  lastStatusUpdatedEvent: HousingEventApi | null;
  campaignAttachedEvents: CampaignHousingEventApi[];
}
```

- [ ] **Step 1: Write the failing `decide()` unit tests**

Create `server/src/scripts/repairs/test/campaign-sending-date.test.ts`. `decide()` is pure, so these need no DB — construct `HousingWithContext` objects directly.

```typescript
import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import type {
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { genHousingApi } from '~/test/testFixtures';
import {
  ATTACHMENT_CORRELATION_TOLERANCE_MS,
  campaignSendingDateRepair
} from '../campaign-sending-date';

const TODAY = '2026-07-15';
const STATUS_EVENT_TIME = '2026-01-01T10:00:00.000Z';

function statusEvent(
  overrides: Partial<HousingEventApi> = {}
): HousingEventApi {
  return {
    id: 'status-event-id',
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: STATUS_EVENT_TIME,
    createdBy: 'user-id',
    housingGeoCode: '01001',
    housingId: 'housing-id',
    ...overrides
  } as HousingEventApi;
}

function attachedEvent(createdAt: string): CampaignHousingEventApi {
  return {
    id: 'attached-event-id',
    type: 'housing:campaign-attached',
    nextOld: null,
    nextNew: { name: 'Campaign' },
    createdAt,
    createdBy: 'user-id',
    housingGeoCode: '01001',
    housingId: 'housing-id',
    campaignId: 'campaign-id'
  };
}

function base() {
  return {
    ...genHousingApi(),
    status: HousingStatus.WAITING,
    subStatus: null,
    today: TODAY,
    campaigns: [{ id: 'campaign-id', sentAt: null }],
    lastStatusUpdatedEvent: statusEvent(),
    campaignAttachedEvents: [attachedEvent(STATUS_EVENT_TIME)]
  };
}

describe('campaignSendingDateRepair.decide', () => {
  it('reverts a housing flipped early by an unsent campaign', () => {
    expect(campaignSendingDateRepair.decide(base())).toEqual({
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: ['status-event-id']
    });
  });

  it('skips when a campaign has already sent', () => {
    const housing = {
      ...base(),
      campaigns: [{ id: 'c', sentAt: '2020-01-01' }]
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when there is no status-updated event', () => {
    const housing = { ...base(), lastStatusUpdatedEvent: null };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when the status event is not the pristine flip shape', () => {
    const housing = {
      ...base(),
      lastStatusUpdatedEvent: statusEvent({
        nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.FIRST_CONTACT] }
      })
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when no campaign-attached event correlates in time', () => {
    const farApart = new Date(
      new Date(STATUS_EVENT_TIME).getTime() +
        ATTACHMENT_CORRELATION_TOLERANCE_MS +
        1
    ).toJSON();
    const housing = {
      ...base(),
      campaignAttachedEvents: [attachedEvent(farApart)]
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('correlates at exactly the tolerance boundary', () => {
    const atBoundary = new Date(
      new Date(STATUS_EVENT_TIME).getTime() +
        ATTACHMENT_CORRELATION_TOLERANCE_MS
    ).toJSON();
    const housing = {
      ...base(),
      campaignAttachedEvents: [attachedEvent(atBoundary)]
    };
    expect(campaignSendingDateRepair.decide(housing)).toMatchObject({
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn nx test server -- campaign-sending-date`
Expected: FAIL — `../campaign-sending-date` does not exist.

- [ ] **Step 3: Implement the repair**

Create `server/src/scripts/repairs/campaign-sending-date.ts`:

```typescript
import { Readable } from 'node:stream';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';

import { isSendDateReached } from '~/models/CampaignApi';
import type { CampaignApi } from '~/models/CampaignApi';
import type {
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import type { HousingApi } from '~/models/HousingApi';
import {
  campaignsHousingTable,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import {
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  CampaignHousingEvents,
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import { today } from '~/utils/date';
import { rows } from './lib/row-stream';
import type { RowStream } from './lib/row-stream';
import type { Repair } from './lib/types';

/**
 * How far apart (ms) a `housing:campaign-attached` event may sit from its paired
 * `housing:status-updated` event and still count as the same createFromGroup
 * call. createFromGroup builds the two event lists in back-to-back synchronous
 * `.map()` passes with no I/O between them, so genuine pairs are milliseconds
 * apart. Calibrate against production before applying (see the plan's rollout
 * task) and raise this above the observed maximum with real margin.
 */
export const ATTACHMENT_CORRELATION_TOLERANCE_MS = 10_000;

export interface HousingWithContext extends HousingApi {
  today: string;
  campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[];
  lastStatusUpdatedEvent: HousingEventApi | null;
  campaignAttachedEvents: CampaignHousingEventApi[];
}

function key(housing: Pick<HousingApi, 'id' | 'geoCode'>): string {
  return `${housing.geoCode}:${housing.id}`;
}

export const campaignSendingDateRepair: Repair<HousingWithContext> = {
  name: 'campaign-sending-date',
  // Reverts `status` (a count-trigger-watched column) over potentially many
  // rows; disable the counts triggers and recompute once.
  bypassTriggers: true,

  // Bulk-enrich the bounded candidate set once, then stream it. `rows<H>()`
  // brands the Readable so `plan()` consumes it type-safely. `buildCandidates`
  // is a hoisted declaration, so calling it above its definition is fine.
  query(): RowStream<HousingWithContext> {
    const output = new Readable({ objectMode: true, read() {} });
    buildCandidates().then(
      (candidates) => {
        candidates.forEach((candidate) => output.push(candidate));
        output.push(null);
      },
      (error) =>
        output.destroy(
          error instanceof Error ? error : new Error(String(error))
        )
    );
    return rows<HousingWithContext>(output);

    async function buildCandidates(): Promise<HousingWithContext[]> {
      const now = today();

      const waiting = (
        await housingRepository.find({
          filters: { status: HousingStatus.WAITING },
          pagination: { paginate: false }
        })
      ).filter((housing) => housing.subStatus === null);

      if (waiting.length === 0) {
        return [];
      }

      const pairs = waiting.map(
        (housing) => [housing.geoCode, housing.id] as [string, string]
      );

      const campaignsByHousing = new Map<
        string,
        Pick<CampaignApi, 'id' | 'sentAt'>[]
      >();
      const statusEventByHousing = new Map<string, HousingEventApi>();
      const attachedByHousing = new Map<string, CampaignHousingEventApi[]>();

      for (const chunk of chunksOf(pairs, 1000)) {
        const campaignRows = await CampaignsHousing()
          .join(
            campaignsTable,
            `${campaignsTable}.id`,
            `${campaignsHousingTable}.campaign_id`
          )
          .whereIn(
            [
              `${campaignsHousingTable}.housing_geo_code`,
              `${campaignsHousingTable}.housing_id`
            ],
            chunk
          )
          .select(
            `${campaignsHousingTable}.housing_geo_code as housing_geo_code`,
            `${campaignsHousingTable}.housing_id as housing_id`,
            `${campaignsTable}.id as campaign_id`,
            `${campaignsTable}.sent_at as sent_at`
          );
        for (const row of campaignRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          const list = campaignsByHousing.get(k) ?? [];
          list.push({
            id: row.campaign_id,
            sentAt: row.sent_at
              ? new Date(row.sent_at).toJSON().slice(0, 10)
              : null
          });
          campaignsByHousing.set(k, list);
        }

        const statusRows = await HousingEvents()
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
            `${EVENTS_TABLE}.id as id`,
            `${EVENTS_TABLE}.next_old as next_old`,
            `${EVENTS_TABLE}.next_new as next_new`,
            `${EVENTS_TABLE}.created_at as created_at`,
            `${EVENTS_TABLE}.created_by as created_by`
          );
        for (const row of statusRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          // Rows are DESC by created_at, so the first seen per housing is latest.
          if (!statusEventByHousing.has(k)) {
            statusEventByHousing.set(k, {
              id: row.id,
              type: 'housing:status-updated',
              nextOld: row.next_old,
              nextNew: row.next_new,
              createdAt: new Date(row.created_at).toJSON(),
              createdBy: row.created_by,
              housingGeoCode: row.housing_geo_code,
              housingId: row.housing_id
            });
          }
        }

        const attachedRows = await CampaignHousingEvents()
          .join(
            EVENTS_TABLE,
            `${EVENTS_TABLE}.id`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.event_id`
          )
          .where(`${EVENTS_TABLE}.type`, 'housing:campaign-attached')
          .whereIn(
            [
              `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_geo_code`,
              `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_id`
            ],
            chunk
          )
          .select(
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_geo_code as housing_geo_code`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_id as housing_id`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.campaign_id as campaign_id`,
            `${EVENTS_TABLE}.id as id`,
            `${EVENTS_TABLE}.next_new as next_new`,
            `${EVENTS_TABLE}.created_at as created_at`,
            `${EVENTS_TABLE}.created_by as created_by`
          );
        for (const row of attachedRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          const list = attachedByHousing.get(k) ?? [];
          list.push({
            id: row.id,
            type: 'housing:campaign-attached',
            nextOld: null,
            nextNew: row.next_new,
            createdAt: new Date(row.created_at).toJSON(),
            createdBy: row.created_by,
            housingGeoCode: row.housing_geo_code,
            housingId: row.housing_id,
            campaignId: row.campaign_id
          });
          attachedByHousing.set(k, list);
        }
      }

      return waiting.map((housing) => {
        const k = key(housing);
        return {
          ...housing,
          today: now,
          campaigns: campaignsByHousing.get(k) ?? [],
          lastStatusUpdatedEvent: statusEventByHousing.get(k) ?? null,
          campaignAttachedEvents: attachedByHousing.get(k) ?? []
        };
      });
    }
  },

  decide(housing) {
    // 1. No sent campaign: if any attached campaign has already sent, the
    //    housing is legitimately WAITING because of it — leave it.
    const hasSentCampaign = housing.campaigns.some((campaign) =>
      isSendDateReached(campaign.sentAt, housing.today)
    );
    if (hasSentCampaign) {
      return { action: 'skip' };
    }

    // 2. Untouched since the auto-flip: the latest status-updated event must be
    //    the pristine "Non suivi" -> "En attente de retour" shape.
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

    // 3. Attributable to a campaign attachment: a campaign-attached event for
    //    this housing sits within the tolerance window of the status event.
    const statusTime = new Date(event.createdAt).getTime();
    const correlated = housing.campaignAttachedEvents.some(
      (attached) =>
        Math.abs(new Date(attached.createdAt).getTime() - statusTime) <=
        ATTACHMENT_CORRELATION_TOLERANCE_MS
    );
    if (!correlated) {
      return { action: 'skip' };
    }

    return {
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: [event.id]
    };
  }
};
```

- [ ] **Step 4: Run the `decide()` tests to verify they pass**

Run: `yarn nx test server -- campaign-sending-date`
Expected: PASS (6 tests).

- [ ] **Step 5: Register the repair**

Edit `server/src/scripts/repairs/index.ts`:

```typescript
import { campaignSendingDateRepair } from './campaign-sending-date';
import type { Repair } from './lib/types';

export const repairs: Record<string, Repair<any>> = {
  'campaign-sending-date': campaignSendingDateRepair
};
```

- [ ] **Step 6: Add a `query()` integration test**

Append to `server/src/scripts/repairs/test/campaign-sending-date.test.ts` a DB-backed test that seeds one WAITING housing (`subStatus: null`) attached to a campaign with `sentAt = null`, plus a pristine `housing:status-updated` event and a `housing:campaign-attached` event pinned to timestamps within `ATTACHMENT_CORRELATION_TOLERANCE_MS`, then **consumes the `query()` stream** and asserts it yields exactly that housing enriched with one campaign (`sentAt: null`), a `lastStatusUpdatedEvent` whose `nextNew.status` is `'En attente de retour'`, and one `campaignAttachedEvents` entry. `query()` now returns a `RowStream<HousingWithContext>` (a `Readable`), so collect it with `stream/promises` `pipeline` into a `Writable` — do NOT `await query()` as an array. Seed events with `genEventApi({ type, creator, nextOld, nextNew })` from `~/test/testFixtures` and attach the `housing_events` / `campaign_housing_events` join rows via the accessors (there is no `genHousingEventApi`; build the join rows explicitly, as in `campaignRepository.test.ts`). Then feed the yielded row through `decide()` and assert it returns the revert action.

```typescript
// added to the same test file
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import {
  Events,
  HousingEvents,
  CampaignHousingEvents,
  formatEventApi
} from '~/repositories/eventRepository';
import {
  genEstablishmentApi,
  genUserApi,
  genCampaignApi,
  genEventApi
} from '~/test/testFixtures';
// add HousingWithContext to the existing import from '../campaign-sending-date'

describe('campaignSendingDateRepair.query (integration)', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  it('enriches an early-flipped WAITING housing so decide reverts it', async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));

    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    const campaign = {
      ...genCampaignApi(establishment.id, user),
      sentAt: null
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await Campaigns().insert(formatCampaignApi(campaign));
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const attached = genEventApi({
      type: 'housing:campaign-attached',
      creator: user,
      nextOld: null,
      nextNew: { name: campaign.title }
    });
    const flip = genEventApi({
      type: 'housing:status-updated',
      creator: user,
      nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
      nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] }
    });
    // Pin created_at so attach + flip fall within ATTACHMENT_CORRELATION_TOLERANCE_MS
    // (genEventApi uses faker.date.past(), which would otherwise place them far apart).
    const flipTime = new Date('2026-01-01T10:00:00.000Z');
    await Events().insert({ ...formatEventApi(flip), created_at: flipTime });
    await Events().insert({
      ...formatEventApi(attached),
      created_at: new Date(flipTime.getTime() + 2000)
    });
    await CampaignHousingEvents().insert({
      event_id: attached.id,
      campaign_id: campaign.id,
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    await HousingEvents().insert({
      event_id: flip.id,
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });

    // query() returns a RowStream (Readable); collect it, don't await an array.
    const enriched: HousingWithContext[] = [];
    await pipeline(
      campaignSendingDateRepair.query(),
      new Writable({
        objectMode: true,
        write(row: HousingWithContext, _encoding, callback) {
          enriched.push(row);
          callback();
        }
      })
    );
    const target = enriched.find((h) => h.id === housing.id);
    expect(target).toBeDefined();
    expect(target!.campaigns).toEqual([{ id: campaign.id, sentAt: null }]);
    expect(target!.lastStatusUpdatedEvent?.nextNew?.status).toBe(
      HOUSING_STATUS_LABELS[HousingStatus.WAITING]
    );
    expect(target!.campaignAttachedEvents).toHaveLength(1);
    expect(campaignSendingDateRepair.decide(target!)).toMatchObject({
      deleteEventIds: [flip.id]
    });
  });
});
```

> The `created_at` pinning above is essential: `genEventApi` timestamps with `faker.date.past()`, so without it the attach and flip events land far apart and `decide` would (correctly) skip on the correlation check, failing the revert assertion. The pattern (`{ ...formatEventApi(event), created_at }`) mirrors `campaignRepository.test.ts` lines ~674–688. Add `HousingWithContext` to the `import type { ... } from '../campaign-sending-date'` you already have from Step 1.

- [ ] **Step 7: Run all repair tests, verify `zlv repair list`**

Run: `yarn nx test server -- campaign-sending-date`
Expected: PASS (unit + integration).

Run: `cd server && yarn zlv repair list`
Expected: prints `campaign-sending-date`.

- [ ] **Step 8: Typecheck and lint**

Run: `yarn nx typecheck server` then `yarn lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/scripts/repairs/campaign-sending-date.ts \
        server/src/scripts/repairs/index.ts \
        server/src/scripts/repairs/test/campaign-sending-date.test.ts
git commit -m "feat(server): add campaign-sending-date backfill repair"
```

---

## Task 8: Rollout — calibrate tolerance and run the backfill (operational)

This task is operational: it runs against production data and has no automated test. Perform it during the change's rollout, after Tasks 1–7 are merged and deployed.

- [ ] **Step 1: Measure the real attach↔flip deltas in production**

Run this read-only query against the production database to find the largest observed gap between a housing's pristine flip event and its correlated campaign-attached event:

```sql
SELECT max(abs(extract(epoch from su.created_at - ca.created_at)) * 1000) AS max_delta_ms,
       percentile_disc(0.99) WITHIN GROUP (
         ORDER BY abs(extract(epoch from su.created_at - ca.created_at)) * 1000
       ) AS p99_delta_ms,
       count(*) AS pairs
FROM housing_events he
JOIN events su ON su.id = he.event_id AND su.type = 'housing:status-updated'
JOIN campaign_housing_events che
  ON che.housing_id = he.housing_id
 AND che.housing_geo_code = he.housing_geo_code
JOIN events ca ON ca.id = che.event_id AND ca.type = 'housing:campaign-attached'
WHERE su.next_old ->> 'status' = 'Non suivi'
  AND su.next_new ->> 'status' = 'En attente de retour'
  AND abs(extract(epoch from su.created_at - ca.created_at)) < 600;  -- ignore obviously unrelated pairs (>10 min)
```

- [ ] **Step 2: Set `ATTACHMENT_CORRELATION_TOLERANCE_MS`**

If `max_delta_ms` exceeds the current constant (`10_000`), raise `ATTACHMENT_CORRELATION_TOLERANCE_MS` in `server/src/scripts/repairs/campaign-sending-date.ts` to comfortably above the observed maximum (e.g. round the max up and add margin), keeping it well below the minute-scale gaps that would indicate an unrelated manual edit. If the observed max is comfortably under `10_000`, leave it. Commit any change with `chore(server): calibrate campaign-sending-date tolerance`.

- [ ] **Step 3: Plan the repair and review the output**

```bash
cd server && yarn zlv repair plan campaign-sending-date --out /tmp/campaign-sending-date
```

Review `/tmp/campaign-sending-date/plan.jsonl` (housings that will be reverted + the status event ids that will be deleted) and `skipped.jsonl`. Spot-check a handful of `plan.jsonl` rows against the DB to confirm each really has no sent campaign and a pristine flip event. Edit or trim `plan.jsonl` if any row looks wrong.

- [ ] **Step 4: Apply**

```bash
cd server && yarn zlv repair apply campaign-sending-date /tmp/campaign-sending-date/plan.jsonl
```

Expected: prints `Bypass triggers: true` and the `Updated / Events deleted / Events created` summary. The reverted housings are back to `NEVER_CONTACTED` (`subStatus` null), their erroneous `housing:status-updated` events are hard-deleted, and the counts triggers are recomputed once.

---

## Self-Review

**Spec coverage:**

- Ongoing mechanism — shared flip function → Task 2. `createFromGroup` gated on `sentAt <= today` → Task 3. `update` flips when saved `sentAt` reaches today → Task 4. Daily idempotent cron for future-dated campaigns → Tasks 5–6. ✓
- Non-goal (no automatic revert when `sentAt` pushed later) — honored: no call site reverts on `update`; only forward flips happen. ✓
- Backfill via the repair harness (`campaign-sending-date`, registered, run via `zlv repair plan/stats/apply`) → Tasks 7–8. ✓
- `query()` returns WAITING + `subStatus = null` housings annotated with campaigns' `sentAt`, most-recent `housing:status-updated` event, and `housing:campaign-attached` events → Task 7 `query()`. ✓
- `decide()` three skip conditions + revert action `{ update: { NEVER_CONTACTED, subStatus: null }, deleteEventIds: [statusEvent.id] }`, no `createEvents` → Task 7 `decide()`. ✓
- Tolerance is an open parameter calibrated against production → concrete default `10_000` in code + measurement query and adjustment in Task 8. ✓
- Testing: controller tests for the gated create/update flip; cron query + idempotency test; repair `decide()` tests one-per-skip-branch + happy path + tolerance-boundary → Tasks 3, 4, 5, 7. ✓
- Rollout ordering (disjoint `sentAt` ranges, repair run once) → Architecture note + Task 8. ✓

**Placeholder scan:** No `TODO`/"handle edge cases"/"similar to Task N" in code steps. `ATTACHMENT_CORRELATION_TOLERANCE_MS` has a real value (`10_000`); Task 8 refines it operationally, not a code placeholder. ✓

**Type consistency:** `flipHousingsToWaiting(housings)`/`flipCampaignHousingsToWaiting(campaign)` (no `createdBy` — the service resolves the system actor itself), `isSendDateReached(sentAt, today)`, `today()`, `flipSentCampaignHousings({ today })`, `HousingWithContext` (`today`, `campaigns`, `lastStatusUpdatedEvent`, `campaignAttachedEvents`), and `ATTACHMENT_CORRELATION_TOLERANCE_MS` are named identically across every task that references them. ✓
