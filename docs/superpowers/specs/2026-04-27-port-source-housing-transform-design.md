# Port source-housing-transform to Polars

## Context

The Dagster pipeline's `transform_housings` function currently does a raw join with no column mapping or business logic. The TypeScript `source-housing-transform.ts` contains the full logic that needs porting.

## Architecture

**Approach B: Polars for bulk ops + Python row-level for business logic.**

### Module: `analytics/import-lovac/src/housings/transform.py`

Three functions:

#### `transform_housings(source, existing_housings, existing_events, year) -> (to_create, to_update, events)`

1. Collect source LazyFrame
2. Left join source with `existing_housings` on `(geo_code, local_id)`
3. Split into `matched` (existing `id` not null) and `unmatched` (null)
4. For unmatched: call `_build_creates(unmatched, year)` → `to_create` DataFrame
5. For matched: call `_build_updates(matched, existing_events, year)` → `(to_update, events)` tuple

#### `_build_creates(unmatched, year) -> pl.DataFrame`

For each row, produce a record matching `fast_housing` schema:
- `id` = `uuidv5(DNS, f"{local_id}:{geo_code}")`
- `address_dgfip` = `[dgfip_address]` (string → array)
- `occupancy` = `"V"`, `occupancy_source` = `"V"`
- `status` = `0` (NEVER_CONTACTED)
- `sub_status` = `None`
- `data_file_years` = `[year]`
- `data_years` = `[2024]`
- `data_source` = `"lovac"`
- Null defaults: `building_group_id`, `cadastral_reference`, `beneficiary_count`, `occupancy_intended`, `actual_dpe`, `energy_consumption_bdnb`, `energy_consumption_at_bdnb`, `geolocation`, `taxed` (from source or null)
- Map remaining source columns to DB names (most are 1:1 except `dgfip_address` → `address_dgfip`)

#### `_build_updates(matched, existing_events, year) -> (pl.DataFrame, pl.DataFrame)`

For each matched row:
- Append `year` to existing `data_file_years`, deduplicate and sort
- Apply `_apply_changes(existing_occupancy, housing_events)`:
  - If already `"V"` (vacant) → no occupancy/status change
  - If last status/occupancy event was by a non-admin user → no change
  - Otherwise → set `occupancy="V"`, `status=0`, `sub_status=None`
- Generate events when occupancy or status actually changed:
  - `housing:occupancy-updated` event
  - `housing:status-updated` event
  - Event `id` = `uuidv5(DNS, f"{housing_id}:housing:{event_type}:{year}")`

Events output has two DataFrames that get written to two tables:
- `events` table: `id, type, old, new, created_by, created_at`
- `housing_events` table: `event_id, housing_geo_code, housing_id`

### Constants

```python
LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuid5.DNS
ADMIN_USER_ID = <queried from DB or passed via config>
```

`ADMIN_USER_ID` is needed for event `created_by` and for the "was last event by admin?" check. It's resolved by querying the `users` table for `system_account_email`. Add `system_account_email` to `ImportLovacConfig` with default `"admin@zerologementvacant.beta.gouv.fr"`. Query the user id once at pipeline start (in the asset) and pass it to the transform.

### Write module updates

The `write_housings` function needs updating because:
- `to_create` and `to_update` DataFrames now have DB-compatible columns
- Events are split across `events` and `housing_events` tables
- The staging table COPY must use the correct column subset (not all `fast_housing` columns)

### Column mapping reference

| Source parquet | DB column | Notes |
|---|---|---|
| `local_id` | `local_id` | |
| `invariant` | `invariant` | |
| `building_id` | `building_id` | |
| `dgfip_address` | `address_dgfip` | Wrapped in array: `[value]` |
| `geo_code` | `geo_code` | |
| `longitude_dgfip` | `longitude_dgfip` | |
| `latitude_dgfip` | `latitude_dgfip` | |
| `cadastral_classification` | `cadastral_classification` | |
| `uncomfortable` | `uncomfortable` | |
| `vacancy_start_year` | `vacancy_start_year` | |
| `housing_kind` | `housing_kind` | |
| `rooms_count` | `rooms_count` | |
| `living_area` | `living_area` | Truncated to int |
| `building_year` | `building_year` | 0 → null |
| `mutation_date` | `mutation_date` | |
| `building_location` | `building_location` | |
| `condominium` | `condominium` | |
| `plot_id` | `plot_id` | |
| `data_file_years` | — | Ignored from source (rebuilt) |
| `geolocation` | — | Ignored from source (set null for creates) |
| `geolocation_source` | `geolocation_source` | |
| `last_mutation_date` | `last_mutation_date` | |
| `last_transaction_date` | `last_transaction_date` | |
| `last_transaction_value` | `last_transaction_value` | |
| `dept` | — | Partition key, not in DB |
| `occupancy_history` | — | Read-only, not written |
| `plot_area` | — | Read-only, not written |
| `last_mutation_type` | — | Read-only, not written |

## Testing

Unit tests in `analytics/import-lovac/tests/test_housings_transform.py`.

Build Polars DataFrames directly (no DB needed). Four scenarios matching TypeScript tests:

1. **New housing (not in DB)** → created with `occupancy="V"`, `status=0`, correct UUIDv5 id
2. **Existing vacant housing** → occupancy/status preserved, `data_file_years` appended
3. **Existing non-vacant, last event by user** → occupancy/status preserved
4. **Existing non-vacant, last event by admin or no events** → reset to `occupancy="V"`, `status=0`, generates occupancy + status events

Additional unit tests:
5. **`_apply_changes`** — isolated tests for the three branches
6. **Column mapping** — verify all renames and defaults are correct
7. **`data_file_years`** — deduplication and sorting
