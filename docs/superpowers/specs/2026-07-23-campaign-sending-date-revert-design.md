# Campaign Sending-Date Revert — Design Spec

**Date:** 2026-07-23
**Status:** Approved (pending user review)
**Supersedes:** the "Non-goal" of [2026-07-15-campaign-sending-date-status-design.md](2026-07-15-campaign-sending-date-status-design.md)

## Relationship to the prior spec

The 2026-07-15 spec introduced the send-date-gated forward flip: a campaign's
`NEVER_CONTACTED` ("Non suivi") housings flip to `WAITING` ("En attente de
retour") once `sentAt <= today`, attributed to the **system account**
(`config.app.system`). It explicitly declared the reverse a **Non-goal**:

> if a campaign's `sentAt` is edited from an already-past date to a later future
> date, housings already flipped to `WAITING` are **not** reverted automatically.

This spec **reverses that decision**. The product rule is now: postponing a
campaign's sending date to a future date must revert the housings that the
send-date rule flipped, and record the change. The prior spec's Non-goal
section is updated to point here.

## Problem

When a campaign's `sentAt` is changed to a date **strictly later than today**
(a genuine postponement), the housings that were auto-flipped to `WAITING`
because the campaign had "sent" no longer reflect reality — the mailing has not
gone out. They should return to `NEVER_CONTACTED`, and each such change must be
recorded as a `housing:status-updated` event attributed to the system account.

The reverse is **riskier than the forward flip**: `NEVER_CONTACTED` is the empty
default, but `WAITING` can hold genuine caseworker work. So the reverse must
touch **only housings it can prove the system auto-flipped and that nothing has
touched since** — never a status a user set deliberately.

## Part 1 — Live behavior (`campaignController.update`)

### Trigger

Fires only in `update`, and only when **both** hold:

- `sentAt` actually changed (`updated.sentAt !== campaign.sentAt`) — the same
  guard the forward flip uses, so metadata-only edits never re-scan housings.
- the new `sentAt` is a real future date (strictly later than today).

`createFromGroup` (a new campaign has no pre-flipped housings) and the daily
cron (forward-only) are untouched. Forward-flip and reverse are mutually
exclusive (`reached` vs `future`), so `update` triggers at most one.

### New helper — `isSendDateInFuture`

Add to `CampaignApi.ts`, the exact complement of the existing
`isSendDateReached`:

```ts
export function isSendDateInFuture(
  sentAt: CampaignApi['sentAt'],
  today: string
): boolean {
  return sentAt !== null && sentAt.slice(0, 10) > today;
}
```

Not simply `!isSendDateReached(...)` — that is also `true` for `null`, which
must **not** trigger a revert.

### Eligibility — "only our untouched auto-flip"

A campaign-`WAITING` housing is reverted only if **both** hold:

1. **No attached campaign has genuinely sent** — none of its campaigns
   satisfies `isSendDateReached(sentAt, today)`. The campaign being postponed is
   now future (saved earlier in the same transaction), so this protects housings
   kept `WAITING` by a *different*, already-sent campaign. (Mirrors the repair's
   rule #1.)
2. **Untouched since our auto-flip** — the housing's most recent
   `housing:status-updated` event is the pristine flip: `nextOld.status =
   "Non suivi"`, `nextNew.status = "En attente de retour"`, **and `createdBy =
   system.id`**.

The `createdBy = system` clause is what lets the live path stay precise. The
repair needs a fragile ±tolerance timestamp-correlation (its rule #3) because
its target flips were attributed to a human; ours are attributed to the system
account, so authorship alone proves it is our own automated flip. No tolerance
window in the live path.

`subStatus = null` is implied by rule #2 (a subStatus change would itself
produce a later `housing:status-updated` event, failing the "pristine, most
recent" check), so it need not be a separate filter.

### Write + event

Atomic conditional transition, mirroring the forward flip's `onlyIfStatus`
guard against concurrent writers:

```
housingRepository.updateMany(
  eligiblePairs,
  { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
  { onlyIfStatus: HousingStatus.WAITING }
)
```

For **each row actually reverted**, create one `housing:status-updated` event by
the system account — `nextOld { status: "En attente de retour" }` → `nextNew {
status: "Non suivi" }`, symmetric with the forward event. We **create** an event
(a genuine business transition: the send was postponed), unlike the repair which
deletes a bug-produced event.

### Service function

New sibling in the service, next to `flipCampaignHousingsToWaiting`:

```ts
revertCampaignHousingsToNeverContacted(
  campaign: Pick<CampaignApi, 'id'>,
  system: UserApi,
  today: string
): Promise<number>
```

It finds the campaign's `WAITING` housings, batch-enriches them (latest
`housing:status-updated` event + attached campaigns' `sentAt`, chunked at 1000
like the repair), filters by the two eligibility rules, performs the conditional
update, writes the events, and returns the count.

As with the forward path, **system-account resolution stays outside the
transaction** (`resolveSystemUser`): a missing/misconfigured system account
defers the revert, it never rolls back the campaign's own metadata save.

### `update` controller wiring

```
const sentAtChanged  = updated.sentAt !== campaign.sentAt;
const shouldFlip     = sentAtChanged && isSendDateReached(updated.sentAt, today());
const shouldRevert   = sentAtChanged && isSendDateInFuture(updated.sentAt, today());
const system = (shouldFlip || shouldRevert) ? await resolveSystemUser() : null;

await startTransaction(async () => {
  await campaignRepository.save(updated);
  if (system && shouldFlip)   await flipCampaignHousingsToWaiting(updated, system);
  if (system && shouldRevert) await revertCampaignHousingsToNeverContacted(updated, system, today());
});
```

### File rename

The services directory is mid-migration to kebab-case (`document-upload.ts`,
`file-validation.ts`). Rename `services/campaignHousingService.ts` →
`services/campaign-housing-service.ts` (and its test
`services/test/campaignHousingService.test.ts` →
`services/test/campaign-housing-service.test.ts`), add the revert function
there, and update the single import in `campaignController.ts`.

## Part 2 — Backfill extension (old-campaign gap)

### The gap

The `createdBy = system` clause matches only auto-flips created by the *new*
rule. Auto-flips from **before this branch** were authored by the human user
(commit `6755ca3ad` changed attribution only going forward — it is code-only,
no historical migration). So:

- **Old never-sent campaigns** — the existing `campaign-sending-date` repair
  already reverts their housings to `NEVER_CONTACTED` and deletes the bad event.
  After it runs, they are `NEVER_CONTACTED`; postponing later is a no-op.
  Covered.
- **Old genuinely-sent campaigns** — the repair leaves their housings `WAITING`
  with **human-authored** events. Postponing such a campaign later would fail
  the `createdBy = system` clause and not auto-revert.

### Fix — re-author old sent-campaign auto-flips to system

Extend the existing `campaign-sending-date` repair with a **second decision
branch** for the case rule #1 currently *skips* (housing has a genuinely-sent
campaign). When such a housing's latest `housing:status-updated` event is a
**pristine, correlated, human-authored** flip, re-author it to the system
account, leaving the housing `WAITING`:

```
{
  // no `update` — status stays WAITING
  deleteEventIds: [oldEvent.id],
  createEvents: [{
    ...same type, nextOld, nextNew, createdAt, housingId, housingGeoCode
    id: uuidv4(),
    createdBy: system.id
  }]
}
```

The harness has no "edit an event's author" primitive (`RepairAction` supports
only housing-field `update`, `createEvents`, `deleteEventIds`), so the rewrite
is expressed as **delete-old + create-replacement** — same `createdAt`/labels,
new id, system author. No harness change.

Identifying *which* old events are auto-flips (vs a genuine manual `"Non suivi"
→ "En attente de retour"` change) reuses the repair's existing signals:
pristine label shape (rule #2) **and** correlation with a `campaign-attached`
event within `ATTACHMENT_CORRELATION_TOLERANCE_MS` (rule #3). Doing this
imperfect call once, in the plan→review→apply cycle (a human reads
`plan.jsonl`), is far safer than in the live request path.

The system account for the repair is resolved once (via
`userRepository.getByEmail(config.app.system)`) and threaded into `decide`
alongside `today` — the same enrichment shape the repair already builds.

### Disjointness

The two repair branches remain disjoint by `sentAt` range:

- **never-sent** (no attached campaign reached) → revert status + delete event;
- **sent** (some attached campaign reached) → keep status + re-author event.

Consistent with the repair's existing "forward logic and repair act on disjoint
ranges" principle. The repair is still unshipped on this branch, so extending it
now costs nothing — no prod re-run.

### Residual gap (documented, accepted)

Old sent-campaign flips where the correlation heuristic **cannot** confirm the
auto-flip stay human-authored and will not auto-revert on a later postponement.
Rare; no data loss (a caseworker can reset manually).

## Testing (TDD — tests first)

**`CampaignApi.test.ts`** — `isSendDateInFuture`: `null` → false; past/today →
false; future → true (property-based over dates around `today`).

**`campaign-housing-service.test.ts`** (renamed) —
`revertCampaignHousingsToNeverContacted`:
- reverts a pristine system-flipped housing and writes one reverse event;
- skips when a sibling campaign is genuinely sent (rule #1);
- skips when the latest status event is not the pristine shape (wrong labels);
- skips when the latest status event is pristine but `createdBy ≠ system`;
- skips a manually-set `WAITING` (no pristine system event);
- returns the count of rows actually reverted.

**`campaign-api.test.ts` — `PUT /campaigns/{id}`:**
- postpone-to-future reverts an auto-flipped housing **and** writes the event;
- the existing "does not flip housings when sentAt is set to the future" case
  (housing was `NEVER_CONTACTED`, never flipped) still passes as a no-op;
- "still saves the campaign when the system account cannot be resolved" holds
  for the postponement path too.

**Repair tests (`repairs/test/campaign-sending-date.test.ts`):**
- new branch: a sent-campaign housing with a pristine, correlated,
  human-authored flip yields `{ deleteEventIds, createEvents(system) }` and
  **no** status update;
- it is skipped when the flip is not correlated, not pristine, or already
  system-authored (idempotent — a second run is a no-op);
- the existing never-sent revert branch is unchanged.

## Out of scope

- `createFromGroup` and the daily cron — unaffected.
- Any change to the repair harness action model.
- Recomputing campaign-level aggregates (`housingCount`, etc.).
- Closing the residual heuristic gap above.
