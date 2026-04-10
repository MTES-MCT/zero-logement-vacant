# Design: Precomputed counts for groups

**Date:** 2026-04-07  
**Status:** Approved

## Problem

Listing groups is slow in production (~8s for Bordeaux Métropole) because `groupRepository.find()` computes `housing_count` and `owner_count` via a `LEFT JOIN LATERAL` that runs `COUNT(DISTINCT)` queries over `groups_housing` and `owners_housing` for every group on every request.

## Solution

Mirror the pattern already established for campaigns (`20260319181202_campaigns-add-counts.ts`): store counts as columns on `groups` and keep them up-to-date with Postgres triggers.

## Migration

File created via `yarn workspace @zerologementvacant/server db migrate:make groups-add-counts`.

### Steps

1. **Add columns** to `groups`:
   - `housing_count INTEGER NOT NULL DEFAULT 0`
   - `owner_count INTEGER NOT NULL DEFAULT 0`

2. **Backfill** existing rows (in the migration — `groups` is a small user-created table, not imported data, so the one-time COUNT cost at deploy time is acceptable):
   ```sql
   UPDATE groups g
   SET
     housing_count = (
       SELECT COUNT(*) FROM groups_housing WHERE group_id = g.id
     ),
     owner_count = (
       SELECT COUNT(DISTINCT oh.owner_id)
       FROM groups_housing gh
       JOIN owners_housing oh
         ON oh.housing_id = gh.housing_id
        AND oh.housing_geo_code = gh.housing_geo_code
        AND oh.rank = 1
       WHERE gh.group_id = g.id
     )
   ```

3. **Trigger A** — `update_group_counts()` on `groups_housing` AFTER INSERT OR DELETE:
   - Recomputes both `housing_count` and `owner_count` for the affected `group_id`
   - Identical structure to `update_campaign_counts()`

4. **Trigger B** — `update_group_owner_count()` on `owners_housing` AFTER INSERT OR DELETE OR UPDATE OF rank:
   - Recomputes `owner_count` for every group that contains the affected housing
   - Guards: exits early when `rank = 1` is not involved
   - Identical structure to `update_campaign_owner_count()`

### Down

- Drop `trg_update_group_owner_count` on `owners_housing`
- Drop function `update_group_owner_count`
- Drop `trg_update_group_counts` on `groups_housing`
- Drop function `update_group_counts`
- Drop columns `housing_count`, `owner_count` from `groups`

## Repository change

In `groupRepository.ts`, replace the `LEFT JOIN LATERAL` block in `listQuery` with direct column selects from `groups`:

```typescript
// Before
.joinRaw(`LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT ${housingTable}.id) AS housing_count,
    COUNT(DISTINCT ${housingOwnersTable}.owner_id) AS owner_count
  FROM ${GROUPS_HOUSING_TABLE}
  ...
) counts ON true`)
.select('counts.*')

// After
// housing_count and owner_count are now plain columns on groups — selected via groups.*
```

No changes needed to `GroupDBO`, `parseGroupApi`, `GroupApi`, or any controller/DTO — the field names and types are already correct.

## No other changes

- No controller, service, model, or DTO changes
- No frontend changes
- The `GroupRecordDBO` interface will gain `housing_count` and `owner_count` (moved from `GroupDBO` extension)
