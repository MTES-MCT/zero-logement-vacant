# LOVAC EETL — source-housings & source-housing-owners

**Date:** 2026-04-15
**Branch:** feat/import-lovac-owner-eetl
**Scope:** backend — `server/src/scripts/import-lovac/`

## Context

The source-owners pipeline was redesigned to the EETL (Extract-Enrich-Transform-Load)
pattern: a dedicated enricher fetches existing DB data in batches, a pure synchronous
transform computes changes, and the command orchestrates the pipeline and writes a JSON
report. This spec applies the same pattern to `source-housings` and
`source-housing-owners`, and eliminates `HousingApi` in favour of `HousingRecordDBO`
throughout both pipelines.

---

## Architecture

### Pattern (mirrors source-owners)

```
Extract  → source repository (file or S3)
Enrich   → dedicated enricher (batch DB fetch via JOIN, no per-record queries)
Transform → pure synchronous function (no DB calls)
Load     → WritableStream sinks in the command
```

### File changes per pipeline

```
source-housings/
  source-housing-enricher.ts         NEW
  source-housing-transform.ts        NEW  (logic extracted from processor)
  source-housing-processor.ts        DELETED
  source-housing-command.ts          MODIFIED

source-housing-owners/
  source-housing-owner-enricher.ts   NEW
  source-housing-owner-transform.ts  NEW  (logic extracted from processor)
  source-housing-owner-processor.ts  DELETED
  source-housing-owner-command.ts    MODIFIED
```

---

## source-housings

### Enricher — `source-housing-enricher.ts`

Batch size: 500 (same as `enrichWith` default).

**Single round-trip query** using PostgreSQL `json_agg`:

```sql
SELECT h.*,
  COALESCE(json_agg(DISTINCT to_jsonb(e.*)) FILTER (WHERE e.id IS NOT NULL), '[]') AS events,
  COALESCE(json_agg(DISTINCT to_jsonb(n.*)) FILTER (WHERE n.id IS NOT NULL), '[]') AS notes
FROM fast_housing h
LEFT JOIN housing_events he
  ON he.housing_geo_code = h.geo_code AND he.housing_id = h.id
LEFT JOIN events e
  ON e.id = he.event_id
  AND e.type IN ('housing:occupancy-updated', 'housing:status-updated')
LEFT JOIN housing_notes hn
  ON hn.housing_geo_code = h.geo_code AND hn.housing_id = h.id
LEFT JOIN notes n ON n.id = hn.note_id
WHERE (h.geo_code, h.local_id) IN (batch)
GROUP BY h.id
```

**Types:**

```typescript
interface HousingEnrichment {
  housing: HousingRecordDBO | null;
  events: ReadonlyArray<EventRecordDBO>;   // [] when housing is null
  notes: ReadonlyArray<NoteRecordDBO>;     // [] when housing is null
}

export type EnrichedSourceHousing = {
  source: SourceHousing;
  existing: HousingEnrichment;
};

export function createSourceHousingEnricher(): TransformStream<SourceHousing, EnrichedSourceHousing>
```

Implemented as a custom `TransformStream` (not using `enrichWith` — compound enrichment shape).

### Transform — `source-housing-transform.ts`

Pure synchronous function — no DB calls.

```typescript
export type HousingChange    = Change<HousingRecordDBO, 'housing'>;
export type HousingEventChange = Change<EventRecordDBO, 'event'>;
export type AddressChange    = Change<AddressDBO, 'address'>;
export type SourceHousingChange = HousingChange | HousingEventChange | AddressChange;

export function createHousingTransform(opts: TransformOptions):
  (enriched: EnrichedSourceHousing) => SourceHousingChange[]
```

Logic:
- `existing.housing === null` → `{ kind: 'create', value: HousingRecordDBO }` +
  optional `AddressChange` (when `ban_label` is present)
- `existing.housing !== null` → `{ kind: 'update', value: HousingRecordDBO }` +
  zero or more `HousingEventChange` produced by `applyChanges`

`applyChanges` receives `EventRecordDBO[]` and `NoteRecordDBO[]` (DBO types replacing
the current Api types). The `user_modified` check currently uses `creator.email` via the
Api types. With DBO types, `created_by` is a UUID — the transform instead receives
`adminUserId: string` (the single admin/system user ID from the command) and checks
`event.created_by !== adminUserId` to determine whether an event/note was written by a
real user.

The `formatHousingRecordApi` conversion step **is removed** from the command pipeline —
the transform emits `HousingRecordDBO` directly.

### Command — `source-housing-command.ts`

Phase structure is preserved (geo-code update → main import → post-import cleanup).

Main import pipeline:

```
stream
  .pipeThrough(progress)
  .pipeThrough(validator)
  .pipeThrough(createSourceHousingEnricher())
  .pipeThrough(map(createHousingTransform(...)))
  .pipeThrough(flatten())
  .tee() → [housing sink, event sink, address sink]
```

`finally` block:

```typescript
sourceHousingReporter.report();
housingReporter.report();
await writeReport(file, options, sourceHousingReporter);
console.timeEnd('Import housings');
```

`writeReport` writes `sourceHousingReporter.getSummary()` as JSON to:
- S3: `{file}.report.json`
- Local: `./import-lovac-{year}-housings.report.json`

---

## source-housing-owners

### Enricher — `source-housing-owner-enricher.ts`

Works on pre-grouped `ReadonlyArray<SourceHousingOwner>` (grouping happens before
enrichment, same position as today). One group = one housing.

**Two queries per group:**

Query 1 — housing + existing housing owners (single JOIN):
```sql
SELECT h.*, ho.*
FROM fast_housing h
LEFT JOIN housing_owners ho
  ON ho.housing_geo_code = h.geo_code AND ho.housing_id = h.id
WHERE h.geo_code = ? AND h.local_id = ?
```
Result: `HousingRecordDBO | null` + `HousingOwnerDBO[]` (grouped from multiple rows).

Query 2 — owners by idpersonne (from source):
```sql
SELECT * FROM owners WHERE idpersonne IN (source_idpersonnes)
```
Result: `OwnerDBO[]`

**Types:**

```typescript
interface HousingOwnerEnrichment {
  housing: HousingRecordDBO | null;
  owners: ReadonlyArray<OwnerDBO>;
  existingHousingOwners: ReadonlyArray<HousingOwnerDBO>;  // [] when housing is null
}

export type EnrichedSourceHousingOwners = {
  source: ReadonlyArray<SourceHousingOwner>;
  existing: HousingOwnerEnrichment;
};

export function createSourceHousingOwnerEnricher(opts):
  TransformStream<ReadonlyArray<SourceHousingOwner>, EnrichedSourceHousingOwners>
```

### Transform — `source-housing-owner-transform.ts`

Pure synchronous function — no DB calls.

```typescript
export type HousingOwnersChange = Change<HousingOwnerDBO[], 'housingOwners'>;
export type HousingEventChange  = Change<EventRecordDBO, 'event'>;
export type HousingOwnerChange  = HousingOwnersChange | HousingEventChange;

export function createHousingOwnerTransform(opts: TransformOptions):
  (enriched: EnrichedSourceHousingOwners) => HousingOwnerChange[]
```

Logic (mirrors current processor):
- `existing.housing === null` → `reporter.failed()`, return `[]`
- Missing owners → `reporter.failed()`, return `[]`
- Computes `activeHousingOwners: HousingOwnerDBO[]` from source + `existing.owners`
- Computes `inactiveHousingOwners: HousingOwnerDBO[]` via set diff on
  `existing.existingHousingOwners` (archived with `PREVIOUS_OWNER_RANK`)
- Generates `EventRecordDBO` for attach/detach/update events

Equivalence comparators (`HOUSING_OWNER_EQUIVALENCE`, `HOUSING_OWNER_RANK_EQUIVALENCE`)
operate on `owner_id` (DBO field) instead of `ownerId`.

`formatHousingOwnerApi` conversion **removed** from command — transform emits
`HousingOwnerDBO` directly.

### Command — `source-housing-owner-command.ts`

```
stream
  .pipeThrough(progress)
  .pipeThrough(validator)
  .pipeThrough(groupBy(a.local_id === b.local_id))
  .pipeThrough(createSourceHousingOwnerEnricher(...))
  .pipeThrough(map(createHousingOwnerTransform(...)))
  .pipeThrough(flatten())
  .tee() → [housing-owners sink, events sink]
```

Structural changes:
- Add `console.time('Import housing owners')` at start
- Replace `try/catch/finally` with `try/finally` (remove redundant catch-and-rethrow)
- Add `writeReport` + `console.timeEnd` in `finally`

Load sinks accept `HousingOwnerDBO[]` directly. `housingOwnerRepository.saveMany`
updated to accept `HousingOwnerDBO[]` (currently accepts `HousingOwnerApi[]`).

---

## Testing

### TDD order — tests written before implementation

#### New unit tests

**`source-housing-enricher.test.ts`**
- Housing not in DB → `existing.housing` is `null`, events/notes are `[]`
- Housing in DB, no events/notes → correct shape, arrays empty
- Housing in DB with events and notes → arrays populated
- Batch of N → single `db.raw` call (spy)

**`source-housing-transform.test.ts`**
- `existing.housing === null` → create change + optional address change
- Housing exists, no occupancy change → update change only
- Housing exists, occupancy needs reset, no user events → update + occupancy event
- Housing exists, occupancy needs reset, has user events → no reset (occupancy preserved)

**`source-housing-owner-enricher.test.ts`**
- Housing not found → `existing.housing` is `null`
- Some source idpersonnes not in DB → `existing.owners` partial
- All found → housing + existing housing owners + owners correct

**`source-housing-owner-transform.test.ts`**
- Missing housing → `reporter.failed()`, returns `[]`
- Missing owners → `reporter.failed()`, returns `[]`
- New owners → correct `HousingOwnersChange` with active owners
- Replaced owners → inactive owners archived + attach/detach events

#### Deleted processor test files

- `source-housings/test/source-housing-processor.test.ts` — DELETED (superseded by `source-housing-transform.test.ts`)
- `source-housing-owners/test/source-housing-owner-processor.test.ts` — DELETED (superseded by `source-housing-owner-transform.test.ts`)

#### Fixes to existing command tests

**`source-housing-owner-command.test.ts`**
- Extract inline file-write to `write()` helper (matches owner test style)
- Add `afterAll(async () => { await rm(file); })` (fixes untracked `housing-owners.jsonl`)

**`source-housing-command.test.ts`** — no structural changes needed.

---

## Constraints

- No changes to shared `infra/` utilities (`enrichWith`, `validator`, `progress`, etc.)
- `HousingApi` must not appear in any modified file in these two pipelines
- The three-phase structure of `source-housing-command.ts` is preserved
- `groupBy` stays in the command (before the enricher), not inside the enricher
