# Complete Dagster Pipeline Translation — Design Spec

## Context

The Dagster import-lovac pipelines in `analytics/import-lovac/src/` are partially translated from the TypeScript scripts in `server/src/scripts/import-lovac/`. This spec covers completing the translation for all pipelines with gaps, using TDD.

## Dependency Order

```
source-buildings → source-owners / source-housings → existing-housings → source-housing-owners
```

`source-buildings` is already complete. Work proceeds left to right.

## Scope Exclusions

- BAN address creation (removed from source files)
- `source-buildings` pipeline (already complete)

---

## 1. source-owners

### 1.1 Transform (`owners/transform.py`)

**Current state**: Joins source with existing on `idpersonne`, splits create/update, maps entity codes, sets `owner_uid` as `id`. Missing: preserved fields from existing owners.

**Change**: `read_existing_owners()` in `owners/read.py` must include preserved columns so they're available after the join:

```sql
SELECT id, idpersonne, data_source, email, phone, administrator, additional_address FROM owners
```

The `to_update` DataFrame carries these from the existing join (with `_existing` suffix).

### 1.2 Write (`owners/write.py`)

**Create path**:
- Timestamps handled via SQL: `DEFAULT` for `created_at`, `now()` for `updated_at` in the INSERT

**Update path** — use `COALESCE` for preserved fields:
```sql
UPDATE owners SET
    id = s.id,
    full_name = s.full_name,
    username = COALESCE(s.username, owners.username),
    birth_date = COALESCE(s.birth_date, owners.birth_date),
    siren = COALESCE(s.siren, owners.siren),
    address_dgfip = s.address_dgfip,
    kind_class = s.kind_class,
    data_source = COALESCE(s.data_source, owners.data_source),
    email = COALESCE(s.email, owners.email),
    phone = COALESCE(s.phone, owners.phone),
    administrator = COALESCE(s.administrator, owners.administrator),
    additional_address = COALESCE(s.additional_address, owners.additional_address),
    updated_at = now()
FROM stg_owners_update s
WHERE owners.idpersonne = s.idpersonne
  AND owners.idpersonne = ANY(%s)
```

### 1.3 Tests (`tests/test_owners_transform.py`)

- Entity mapping (all codes 0–9 + null)
- Create/update split based on existing match
- `owner_uid` used as `id` in both create and update
- `data_source` set to year on create

---

## 2. source-housings — Event Structure Fix

### 2.1 Current Problem

Events use columns `old`/`new` with flat strings. The DB schema uses `next_old`/`next_new` with JSONB.

### 2.2 Changes

**`_events_schema()`**: Rename `old` → `next_old`, `new` → `next_new`. Type remains `pl.Utf8` (JSON-serialized).

**Event payloads** (JSON-serialized strings):

- `housing:created`:
  - `next_old`: `null`
  - `next_new`: `{"source": "<year>", "occupancy": "Vacant"}`
- `housing:occupancy-updated`:
  - `next_old`: `{"occupancy": "<label>"}`
  - `next_new`: `{"occupancy": "<label>"}`
- `housing:status-updated`:
  - `next_old`: `{"status": "<label>", "subStatus": "<sub>"}`
  - `next_new`: `{"status": "<label>", "subStatus": "<sub>"}`

**Labels** use human-readable French labels (with proper typographic apostrophes `\u2019`):

Occupancy labels:
| Code | Label |
|------|-------|
| `V` | `Vacant` |
| `L` | `En location` |
| `B` | `Meublé de tourisme` |
| `P` | `Occupé par le propriétaire` |
| `RS` | `Résidence secondaire non louée` |
| `T` | `Local commercial ou bureau` |
| `N` | `Dépendance` |
| `D` | `Local démoli ou divisé` |
| `G` | `Occupé à titre gratuit` |
| `F` | `Fonctionnaire logé` |
| `R` | `Occupé par un artisan exonéré` |
| `U` | `Utilisation commune` |
| `X` | `Bail rural` |
| `A` | `Autres` |
| `inconnu` | `Pas d\u2019information` |

Housing status labels:
| Code | Label |
|------|-------|
| `0` | `Non suivi` |
| `1` | `En attente de retour` |
| `2` | `Premier contact` |
| `3` | `Suivi en cours` |
| `4` | `Suivi terminé` |
| `5` | `Suivi bloqué` |

### 2.3 Tests

Update existing `tests/test_housings_transform.py` to assert `next_old`/`next_new` column names and JSON structure.

---

## 3. existing-housings

### 3.1 Transform (`existing_housings/transform.py`)

**Input**: `housings_missing` DataFrame (already filtered by read: `occupancy='V'`, `status IN (0, 1)`, year not in `data_file_years`).

**Output**: `(to_update, events, housing_events)` — 3-tuple.

**Logic** — for every row in `housings_missing`:
- Set `occupancy = 'inconnu'`, `status = 4`, `sub_status = 'Sortie de la vacance'`
- Generate `housing:occupancy-updated` event:
  - `id`: UUID5 of `{housing_id}:housing:occupancy-updated:{year}`
  - `next_old`: `{"occupancy": "Vacant"}`
  - `next_new`: `{"occupancy": "Pas d\u2019information"}`
- Generate `housing:status-updated` event:
  - `id`: UUID5 of `{housing_id}:housing:status-updated:{year}`
  - `next_old`: `{"status": "<label for existing status>", "subStatus": "<existing sub_status or null>"}`
  - `next_new`: `{"status": "Suivi terminé", "subStatus": "Sortie de la vacance"}`

`to_update` contains only `id`, `occupancy`, `status`, `sub_status` columns.

Events go into `events` table + `housing_events` join table.

### 3.2 Write (`existing_housings/write.py`)

- Update signature to accept 3-tuple `(to_update, events, housing_events)`
- Events write into `events` + `housing_events` (same pattern as source-housings write)
- Staging table for `to_update` only needs `id`, `occupancy`, `status`, `sub_status`

### 3.3 Asset (`assets.py`)

- Pass `year` and `admin_user_id` to `transform_existing_housings`
- Handle 3-tuple return

### 3.4 Tests (`tests/test_existing_housings_transform.py`)

- Sets occupancy to `inconnu`, status to `4`, sub_status to `Sortie de la vacance`
- Generates `housing:occupancy-updated` event with correct UUID5 and labels
- Generates `housing:status-updated` event with correct UUID5 and labels
- Event `housing_events` join rows have correct `event_id`, `housing_id`, `housing_geo_code`
- All input rows produce updates (read already filters)

---

## 4. source-housing-owners

### 4.1 Transform (`housing_owners/transform.py`)

**Input**: source (LazyFrame), existing_housings, existing_owners, existing_housing_owners, year, admin_user_id.

**Output**: `(housing_owner_rows, events, housing_owner_events)` — 3-tuple.

**Logic** (per housing, grouped by `geo_code + local_id`):

1. Join source with existing housings on `(geo_code, local_id)` → get `housing_id`. Inner join (skip missing housing).
2. Join with existing owners on `owner_uid = id` → confirms owner exists. Inner join (skip missing owner). Rename `owner_uid` → `owner_id`.
3. Build **active owners** from source: `(owner_id, housing_id, housing_geo_code, rank, idprocpte, idprodroit, locprop_source, property_right, start_date=now, end_date=null, origin=null, locprop_relative_ban=null, locprop_distance_ban=null)`
4. Compare with existing housing owners per housing:
   - **added**: active owners whose `owner_id` not in existing active (rank 1–6) → `housing:owner-attached` event
   - **removed**: existing active whose `owner_id` not in new active → archive to `rank=-1` with `end_date=now` → `housing:owner-detached` event
   - **rank changed**: same `owner_id` in both existing active and new active but different rank → `housing:owner-updated` event
   - **preserved inactive**: existing owners with `rank=-1` whose `owner_id` not in new active → keep unchanged
5. Output = full replacement set (new active + archived removed + preserved inactive)

**Events** (into `events` table):
- `id`: UUID5 of `{housing_id}:housing:{event_type}:{owner_id}:{year}`
- `type`: `housing:owner-attached` | `housing:owner-detached` | `housing:owner-updated`
- `next_old`: `null` for attached; `{"name": "<full_name>", "rank": <old_rank>}` for detached/updated
- `next_new`: `{"name": "<full_name>", "rank": <new_rank>}` for attached/updated; `null` for detached
- `created_by`: admin_user_id
- `created_at`: now

**Housing owner events** (into `housing_owner_events` join table):
- `event_id`, `housing_geo_code`, `housing_id`, `owner_id`

### 4.2 Read (`housing_owners/read.py`)

- `read_existing_owners_for_join()`: Add `full_name` to SELECT (needed for event payloads):
  ```sql
  SELECT id, full_name FROM owners
  ```

### 4.3 Write (`housing_owners/write.py`)

- Handle 3-tuple `(housing_owner_rows, events, housing_owner_events)`
- Housing owner rows: DELETE existing for matched housing IDs, INSERT new set
- Events: INSERT into `events` + `housing_owner_events` (ON CONFLICT DO NOTHING)
- Columns for `owners_housing` insert: `owner_id, housing_id, housing_geo_code, rank, start_date, end_date, origin, idprocpte, idprodroit, locprop_source, property_right, locprop_relative_ban, locprop_distance_ban`

### 4.4 Asset (`assets.py`)

- Pass `year` and `admin_user_id` to transform
- Handle 3-tuple return

### 4.5 Tests (`tests/test_housing_owners_transform.py`)

- New owner attached → active with rank, `owner-attached` event with `next_new={name, rank}`
- Existing owner replaced → archived with `rank=-1` and `end_date`, `owner-detached` event with `next_old={name, rank}`
- Rank change → `owner-updated` event with `next_old` and `next_new` showing old/new ranks
- Inactive owner preserved unchanged when not in new active set
- Missing housing → row skipped (inner join)
- Missing owner → row skipped (inner join)
- Event UUIDs are deterministic (UUID5)
- `housing_owner_events` join rows have correct `owner_id`

---

## Shared Constants Module

Create `analytics/import-lovac/src/constants.py`:

```python
import uuid

LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
PREVIOUS_OWNER_RANK = -1

OCCUPANCY_LABELS = {
    "V": "Vacant",
    "L": "En location",
    "B": "Meublé de tourisme",
    "P": "Occupé par le propriétaire",
    "RS": "Résidence secondaire non louée",
    "T": "Local commercial ou bureau",
    "N": "Dépendance",
    "D": "Local démoli ou divisé",
    "G": "Occupé à titre gratuit",
    "F": "Fonctionnaire logé",
    "R": "Occupé par un artisan exonéré",
    "U": "Utilisation commune",
    "X": "Bail rural",
    "A": "Autres",
    "inconnu": "Pas d\u2019information",
}

HOUSING_STATUS_LABELS = {
    0: "Non suivi",
    1: "En attente de retour",
    2: "Premier contact",
    3: "Suivi en cours",
    4: "Suivi terminé",
    5: "Suivi bloqué",
}
```

Deduplicate `LOVAC_NAMESPACE` from `housings/transform.py` to use this shared module.

---

## Test Infrastructure

All tests in `analytics/import-lovac/tests/`. Pure unit tests using Polars DataFrames — no database needed. Follow the pattern in `test_housings_transform.py`.
