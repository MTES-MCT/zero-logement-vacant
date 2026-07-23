# Campaign Sending-Date-Gated Housing Status — Design Spec

**Date:** 2026-07-15
**Status:** Approved

## Problem

Today, `campaignController.createFromGroup` flips every `NEVER_CONTACTED` ("Non suivi") housing attached to a new campaign to `WAITING` ("En attente de retour") **immediately at campaign creation**, regardless of the campaign's `sentAt` ("date d'envoi") field. `sentAt` is optional at creation and can also be set/confirmed later via a separate modal (`CampaignSentAtModal`), and can be any date — past, today, or future. In practice this means a housing can show "waiting for a reply" days or weeks before the mailing has actually gone out.

The product team wants the status change gated on the campaign's sending date: a housing should become `WAITING` only once `sentAt <= today`. If `sentAt` is already `<= today` at the moment a campaign is created or updated, the flip happens immediately; otherwise it should happen automatically once that date arrives.

This also raises a data-correctness question: every campaign created under the old rule already flipped its housings unconditionally, so there is currently `WAITING` housing data that would not exist under the new rule (campaigns with `sentAt` null or in the future). This spec covers both the ongoing rule and that backfill.

## Decision: ongoing mechanism — daily cron, not lazy/derived status

`housing.status` is a stored, filterable, sortable field used pervasively (filters, exports, events, subStatus workflows). Computing an "effective" status at read time instead of persisting the transition would be a much larger structural change for no real benefit. Instead:

- Extract the existing flip logic (filter a campaign's housings to `NEVER_CONTACTED`, build `housing:campaign-attached` + `housing:status-updated` events, update statuses) out of `createFromGroup` into a shared function reused by three call sites.
- **`createFromGroup`** — call it immediately, only if `body.sentAt !== null && body.sentAt <= today`.
- **`update`** — a campaign's `sentAt` moves from `null` to a date, or can be corrected to a different date (it can never be unset once set — already enforced). Whenever the saved `sentAt` is `<= today`, call the same function for that campaign's still-`NEVER_CONTACTED` housings. This covers same-day confirmation and retroactive correction without waiting for the next cron run.
- **New daily cron job** — added to `clevercloud/cron.json`, following the existing Cerema-sync pattern. Once a day, find campaigns where `sentAt <= today` that still have `NEVER_CONTACTED` housings attached, and flip them. This is what makes a future-dated campaign transition automatically once its date arrives, with no user action required, and is idempotent (harmless to re-scan already-settled campaigns).

**~~Non-goal~~ (superseded 2026-07-23):** this spec originally declared that editing a campaign's `sentAt` from an already-past date to a later future date would **not** revert housings already flipped to `WAITING`. That decision was reversed — see [2026-07-23-campaign-sending-date-revert-design.md](2026-07-23-campaign-sending-date-revert-design.md), which adds the automatic reverse (postpone-to-future → `WAITING` back to `NEVER_CONTACTED`, with a system-attributed event) plus a backfill re-authoring old auto-flip events. Reverting via the existing explicit-removal path (`shouldReset`) is unaffected either way.

## Decision: backfill via the repair harness, not a bespoke script

The [ZLV repair harness](2026-07-08-zlv-repair-harness-design.md) exists specifically for this kind of historical-data correction ("reset housing to 'Non suivi' if its campaign has no valid sending date" is its example use case #1). The backfill is implemented as a new repair, `campaign-sending-date`, registered in `server/src/scripts/repairs/index.ts`, and run via `zlv repair plan/stats/apply` rather than a one-off script.

### `query()`

Fetch housings where `status = WAITING` and `subStatus = null`, each annotated with:

- its attached campaigns' `sentAt` values,
- its most recent `housing:status-updated` event,
- its `housing:campaign-attached` events (with `createdAt`).

`H = HousingApi & { campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[]; lastStatusUpdatedEvent: HousingEventApi | null; campaignAttachedEvents: CampaignHousingEventApi[] }`.

### `decide(housing)`

Skip unless **all** of the following hold, in which case revert:

1. **No sent campaign.** None of the housing's attached campaigns have `sentAt <= today`. (If even one has genuinely sent, the housing must stay `WAITING` because of that campaign — this also correctly handles housings attached to multiple campaigns.)
2. **Untouched since the auto-flip.** The housing's most recent `housing:status-updated` event is exactly the pristine shape produced by campaign attachment: `nextOld.status = "Non suivi"` → `nextNew.status = "En attente de retour"`. If anything else happened to the housing's status since, leave it alone.
3. **Attributable to a campaign attachment, not a coincidental manual edit with the same shape.** A `housing:campaign-attached` event exists whose `createdAt` falls within a tolerance window of that status-updated event's `createdAt`. `housing:campaign-attached` and `housing:status-updated` events are built in two separate `.map()` passes in `createFromGroup`, each calling `new Date().toJSON()` independently, so they won't share an exact timestamp but should be very close (no I/O between the two loops). **The tolerance value is an open parameter, to be calibrated during implementation** by querying production data for the actual observed deltas between paired events and picking a window with real margin above the observed maximum, rather than guessing.

If all three hold:

```typescript
{
  update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
  deleteEventIds: [thatStatusUpdatedEvent.id]
  // no createEvents
}
```

No new event is created. This is a correctness fix, not a new business event — the erroneous status-updated event is hard-deleted (consistent with the harness's event-handling rule: bad events produced by a bug are incorrect facts, not user actions to reverse). The `housing:campaign-attached` event is left untouched: the housing genuinely is/was attached to that campaign, and that fact doesn't change.

### Rollout ordering

The repair and the ongoing create/update/cron logic act on disjoint `sentAt` ranges (the repair only reverts housings whose campaigns all have `sentAt` null/future; the forward-flip logic only acts on campaigns with `sentAt <= today`), so they cannot fight over the same housing regardless of relative ordering. The repair is run once (`plan` → review `plan.jsonl`/`skipped.jsonl` → `apply`) as part of rolling out this change.

## Testing

- Controller tests for the gated flip in `createFromGroup` (no flip when `sentAt` is null/future, immediate flip when `sentAt <= today`) and in `update` (flip triggers when a saved `sentAt` transitions to `<= today`).
- A test for the cron job's query and its idempotency (already-settled campaigns are left untouched on a second run).
- Unit tests for the repair's `decide()`, per the harness's pattern of testing `query` + `decide` in isolation: one test per skip branch (sent campaign present, event shape doesn't match, no correlated attachment event) plus the happy revert path. The tolerance-window boundary is the trickiest case and deserves explicit edge-case tests once the value is calibrated.

## What this does not cover

- ~~Reversing a housing's status if a campaign's `sentAt` is pushed later after housings already flipped (see non-goal above).~~ Now covered by [2026-07-23-campaign-sending-date-revert-design.md](2026-07-23-campaign-sending-date-revert-design.md).
- Campaign creation paths other than `createFromGroup` — this is currently the only way to create a campaign (confirmed via `server/src/routers/protected.ts`).
- Recomputing campaign-level aggregates (`housingCount`, `ownerCount`, `returnCount`, `returnRate`) as part of the backfill — out of scope unless investigation during implementation shows they're derived from housing status rather than computed independently.
