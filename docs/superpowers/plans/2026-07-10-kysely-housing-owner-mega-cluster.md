# Kysely Migration — Housing + Owner + HousingOwner Mega-Cluster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:tdd` (behaviour-preserving refactor under existing characterization tests) and, for the multi-file fan-out, `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-07-10
**Base branch:** `feat/kysely-setup` (bridge + Phase-2 tests, PR #1787)
**Prior clusters:** note #1897, document #1898, housingDocument #1899, group cluster #1900, campaign cluster #1901

## Goal

Migrate the **housing-create write-cluster** from Knex to Kysely behind the dual-engine bridge, in a single coordinated PR, preserving behaviour (all characterization + API tests stay green). This is the last and largest cluster; it also unblocks the deferred reads that depend on `parseHousingRecordApi`.

## Why this must be one cluster (the governing constraint)

The bridge (`startTransaction`) commits Knex+Kysely atomically but does **NOT** make one engine's uncommitted rows visible to the other. See memory `project_kysely_bridge_fk_visibility` and the campaignHousing revert. `housingController.createHousing` (server/src/controllers/housingController.ts:438) does, in one `startTransaction`:

```
Promise.all([
  housingRepository.save(housing),               // NEW housing
  ownerRepository.betterSaveMany(missingOwners)  // NEW owners
])
housingOwnerRepository.saveMany(housingOwners)   // owners_housing -> owners + housing
refreshMultiOwnerFlags(affectedOwnerIds)         // UPDATE owners.is_multi_owner (reads owners_housing)
Promise.all([
  banAddressesRepository.save(banAddress),
  eventRepository.insertManyHousingEvents(...),        // housing_events -> housing
  eventRepository.insertManyOwnerEvents(...),          // owner_events -> owners
  eventRepository.insertManyHousingOwnerEvents(...)    // housing_owner_events -> owners + housing
])
```

FK edges that cross the cluster: `owners_housing -> owners`, `owners_housing -> fast_housing`, `owner_events -> owners`, `housing_owner_events -> owners`/`fast_housing`, and `refreshMultiOwnerFlags` reads `owners_housing` and writes `owners`. Because the owners **and** the housing are freshly inserted in this block, every one of these must be on the **same engine** or the FK/visibility fails. There is no safe independent slice.

## Scope — migrate to Kysely (together)

- [ ] `housingRepository`: **write path only** — `save`, `saveMany` (onConflict `['geo_code','local_id']` merge/ignore), `update`, `updateMany`, `remove`.
- [ ] `ownerRepository`: **write path only** — `betterSave`, `betterSaveMany`, `insert`, `update`, and `refreshMultiOwnerFlags`.
- [ ] `housingOwnerRepository`: `saveMany`, `insert` (write path). `findByOwner` STAYS Knex (it feeds `parseHousingRecordApi`).
- [ ] `eventRepository`: `insertManyHousingEvents`, `insertManyOwnerEvents`, `insertManyHousingOwnerEvents` → Kysely (add camelCase `toEventInsert` if not already present on this branch, plus per-join mappers). All other event methods stay on Knex.

## Explicitly OUT of scope (stays Knex — follow-up PRs)

- All **reads**: `housing.find/findOne` (uses `db.raw(to_json(owner.*))`, `to_json(ban.*)`), `owner.get/find` (FTS `whereRaw full_name_fts @@ to_tsquery`), `housingOwner.findByOwner`, and the deferred `group.find/findOne`, draft/sender reads. These are read-only, not part of the FK cluster.
- `ownerRepository.updateAddressList` (raw `db.raw(update)` — also carries a pre-existing SQL-injection concern flagged in review; do NOT migrate or "fix" here — behaviour preservation only).
- `ownerRepository.save`/`saveMany` legacy methods if they have no app callers (verify with grep; leave Knex if unused).
- `banAddressesRepository` (writes `ban_addresses`; verify it has no cross-engine FK into the cluster — `ban_addresses` is referenced by owner/housing, not the reverse, and is written after the owners/housing exist in-tx; if its writes reference uncommitted Kysely owners, it must join too — CHECK during implementation).

## Known hazards (address explicitly)

- [ ] **`owners_housing.start_date` / `end_date` are `date` columns → typed `ColumnType<string,string,string>` by kysely-codegen**, but the API carries `Date`. The Knex path inserts `Date`/`new Date()`. Convert to a `YYYY-MM-DD` string (or verify pg accepts `Date` for a `date` param and cast) — pick the option that keeps the characterization tests green; watch for TZ boundary shifts.
- [ ] **`refreshMultiOwnerFlags`** recomputes `owners.is_multi_owner` via `db.raw(...)` reading `owners_housing`. It runs inside block 438 **after** `housingOwner.saveMany`, so it must read the Kysely-written `owners_housing` on the same connection → migrate it to Kysely (`withinKyselyTransaction`, reproduce the raw recompute with `sql`). Cross-check against the statement-level count triggers (migration `20260506144726_owners-housing-counts-triggers-statement-level`) — see memory `feedback_skip_recompute_for_invariant_preserving_writes`: confirm whether the recompute is still needed or now trigger-maintained.
- [ ] **DB triggers on `owners_housing`** (housing/owner counts) fire regardless of engine (they're server-side). Verify they still see the right rows when the write is Kysely within the bridge.
- [ ] **`owner_events`/`housing_owner_events` onConflict**: mirror the Knex `.onConflict('id'/'event_id').ignore()` with Kysely `oc.column(...).doNothing()`.
- [ ] Preserve the full exported Knex surface (`Housing`/`Owners`/`HousingOwners` accessors, all `*DBO` types, `format*Api`/`parse*Api`) — heavily used by seeds, the LOVAC import scripts, the test factory, and the reads that stay Knex.

## Transaction blocks to verify green (the FK paths)

- [ ] `housingController.createHousing` (:438) — the coupled block (new housing + owners + links + 3 event kinds + refreshMultiOwnerFlags).
- [ ] `housingController` (:569) — housing update + housing events (housing pre-existing).
- [ ] `ownerController.updateHousingOwners` (:486) — `housingOwner.saveMany` + `insertManyHousingOwnerEvents` (owners/housing pre-existing).
- [ ] `ownerController` (:319 update, :208 create) — `betterSave` + `insertManyOwnerEvents` (NOT in `startTransaction`; owner pre-existing/just-committed).
- [ ] `campaignController` (:358 remove) — `housingRepository.saveMany` runs here too; ensure it still composes with the already-Kysely campaign-housing events (from #1901) — cross-cluster interaction.

## Tasks (suggested order — one green checkpoint per step)

1. [ ] **Baseline**: run and record green for `housingRepository`, `ownerRepository`, `housingOwnerRepository`, `eventRepository` repo tests + `housing-api`, `owner-api`, `campaign-api`, `group-api` (many of these exercise the cluster). Note the pre-existing S3-mock `document-api` failures are unrelated.
2. [ ] **eventRepository**: migrate the 3 event methods + mappers. Verify event tests + all `*-api` consumers.
3. [ ] **ownerRepository writes** (`betterSave`, `betterSaveMany`, `insert`, `update`, `refreshMultiOwnerFlags`). Add camelCase insert/update mappers mirroring `formatOwnerApi`. Verify owner tests + owner-api.
4. [ ] **housingOwnerRepository writes** (`saveMany`, `insert`) with the date-column handling. Verify housingOwner tests.
5. [ ] **housingRepository writes** (`save`, `saveMany`, `update`, `updateMany`, `remove`). Add camelCase mappers mirroring `formatHousingRecordApi` (large — many columns; consider a subagent to draft the mapper, then review every column against the generated `FastHousing` type). Verify housing tests + housing-api.
6. [ ] **Full cluster verification**: `housing-api` (createHousing block), `owner-api` (updateHousingOwners), `campaign-api` (remove path), `group-api`. All green.
7. [ ] **Gates**: `yarn nx typecheck server` (0 errors; `@deprecated` field hints from mirrored formatters are acceptable), `yarn lint` (0 new warnings on the modified files).
8. [ ] Open PR (base `feat/kysely-setup`, label `refactor`, assign `@me`); document what stayed Knex (reads, updateAddressList) as the remaining follow-up.

## Definition of Done

- housing/owner/housingOwner **write paths** + the 3 event methods are on Kysely; the createHousing FK block is green.
- All characterization + API tests green (except the pre-existing S3-mock `document-api` failures); typecheck + lint clean.
- No behaviour change; exported Knex surface intact; reads + `updateAddressList` remain Knex (documented follow-up).
- After this lands, the only Knex writers left are the reads' query builders and `updateAddressList`; the final steps are migrating the reads (unblocked here) and then removing Knex per the design's "Step final".
